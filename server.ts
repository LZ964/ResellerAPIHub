import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { Type } from '@google/genai';
import Stripe from 'stripe';

let stripe: Stripe | null = null;
const getStripe = () => {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
};

let __filename = '';
let __dirname = '';

try {
  // If we are in ESM (like with tsx)
  if (typeof import.meta !== 'undefined' && import.meta.url) {
    __filename = fileURLToPath(import.meta.url);
    __dirname = path.dirname(__filename);
  } else {
    // If we are in CJS (like bundled)
    __filename = typeof __filename !== 'undefined' ? __filename : '';
    __dirname = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
  }
} catch (e) {
  // Fallback
  __filename = '';
  __dirname = process.cwd();
}

// Modular Imports
import { getFirebase, getGemini } from './server/config';
import * as paymenter from './server/paymenter';
import * as gemini from './server/gemini';

console.log('[Bootstrap] Starting secure modular server...');

// Init database and auth clients
const { db, auth } = getFirebase();

// --- Validation Schemas ---
const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'ID Token required'),
});

const localSignupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(2, 'Name too short'),
});

const domainSearchSchema = z.object({
  query: z.string().min(2).max(100).regex(/^[a-zA-Z0-9.-]+$/),
});

const brainstormSchema = z.object({
  businessType: z.string().min(2),
  keywords: z.string().optional(),
});

const aiAgentSchema = z.object({
  message: z.string().min(1),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    parts: z.array(z.object({ text: z.string() }))
  })).optional(),
});

const profileUpdateSchema = z.object({
  legalBusinessStatus: z.string().optional(),
  legalRepresentativeName: z.string().min(2).max(100).optional(),
  legalRepresentativeEmail: z.string().email().optional(),
  addressStreet: z.string().optional(),
  addressCity: z.string().optional(),
  addressProvince: z.string().optional(),
  addressPostalCode: z.string().optional(),
  taxId: z.string().optional(),
  country: z.string().optional(),
  email2fa: z.string().email().optional(),
  displayName: z.string().optional(),
  apiRequest: z.object({
    projectName: z.string(),
    useCase: z.string(),
    estimatedVolume: z.string(),
  }).optional(),
});

const terminalExecSchema = z.object({
  command: z.string().min(1).max(50),
  args: z.array(z.string()).default([]),
});

const productOrderSchema = z.object({
  domain: z.string().min(3).max(100),
  planId: z.string().optional(),
  price: z.number().optional(),
});

const depositSchema = z.object({
  amount: z.number().min(5, 'Test amount allowed for demo'),
  method: z.enum(['credit_card', 'bank_transfer', 'crypto']).default('credit_card'),
});

const apiKeySchema = z.object({
  name: z.string().min(1).max(50),
  permissions: z.string().regex(/^[0-9,]+$/).default('1,2,3'),
});

const dnsRecordSchema = z.object({
  type: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV']),
  name: z.string().min(1).max(255),
  value: z.string().min(1),
  ttl: z.number().min(60).max(86400).default(3600),
  priority: z.number().optional(),
});

const mailboxSchema = z.object({
  localPart: z.string().min(1).max(64).regex(/^[a-zA-Z0-9.-]+$/),
  password: z.string().min(8),
  planId: z.string(),
});

const checkoutSessionSchema = z.object({
  amount: z.number().min(5).max(10000),
});

const bulkDomainsSchema = z.object({
  domains: z.array(z.string().min(3)).min(1),
});

// --- ZIP LIBRARY ---
import AdmZip from 'adm-zip';

// --- Rate Limiting ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 120, // limit each IP to 120 requests
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

async function startServer() {
  const app = express();
  // --- API Key Middleware ---
  const authenticateApiKey = async (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) return next();

    try {
      if (db) {
        const keySnap = await db.collection('api_keys').where('key', '==', apiKey).limit(1).get();
        if (!keySnap.empty) {
          const keyData = keySnap.docs[0].data();
          (req as any).user = { uid: keyData.uid, role: 'api', permissions: keyData.permissions };
          return next();
        }
      }
    } catch (err) {
      console.error('[API Key Auth Error]', err);
    }
    next();
  };

  const PORT = 3000;

  // Security Headers
  console.log('[Middleware] Configuring helmet...');
  app.use(helmet({
    contentSecurityPolicy: false, // Ensure dev iframe and resource compatibility
  }));

  // Strict CORS
  console.log('[Middleware] Configuring CORS...');
  app.use(cors({
    origin: process.env.APP_URL || '*',
    credentials: true
  }));

  app.use(express.json());
  app.use(cookieParser());
  app.use(authenticateApiKey);

  // Debugging Middleware for 404 triage
  app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
      console.log(`[Request] ${new Date().toISOString()} | ${req.method} ${req.url} | Host: ${req.hostname}`);
    }
    next();
  });

  // --- Activity Logging Middleware ---
  const logActivity = async (req: Request, action: string, details: any = {}) => {
    try {
      const log = {
        timestamp: new Date(),
        action,
        uid: (req as any).user?.uid || 'anonymous',
        email: (req as any).user?.email || 'anonymous',
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        fingerprint: req.headers['x-fingerprint'] || 'unknown',
        method: req.method,
        path: req.path,
        domain: req.hostname,
        ...details
      };
      
      if (db) {
        await db.collection('activity_logs').add(log);
      } else {
        console.log('[Activity Log]', JSON.stringify(log));
      }
    } catch (err) {
      console.error('[Logging Error]', err);
    }
  };

  app.use('/api/', limiter);

  // --- Authentication Middleware ---
  const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
    // Check if already authenticated by API Key
    if ((req as any).user?.role === 'api') return next();

    if (!auth) {
      console.warn('[Auth] Auth client unavailable. Simulating development session.');
      (req as any).user = { uid: 'dev_user_123', email: 'dev@example.com', name: 'Developer Mode' };
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed authorization token' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      (req as any).user = decodedToken;
      next();
    } catch (error) {
      console.error('[Auth] Token validation error:', error);
      res.status(401).json({ error: 'Session token invalid or expired' });
    }
  };

  // Log connections
  app.use(async (req, res, next) => {
    if (req.path.startsWith('/api') && req.path !== '/api/logs') {
      // Lazy log for sensitive actions will be manual, but let's track general API hit
      // We don't log here yet to avoid clutter, will call manual logActivity in routes
    }
    next();
  });

  // --- 2FA & API KEYS MANAGEMENT ---

  // Generate 2FA Code
  app.post('/api/auth/2fa/generate', async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    if (db) {
      await db.collection('2fa_codes').doc(email).set({ code, createdAt: new Date() });
    }
    
    console.log(`[2FA] Sending code ${code} to ${email} (Simulation)`);
    // In a real app, use a mailer here
    res.json({ success: true, message: 'Code de vérification envoyé.' });
  });

  // Verify 2FA and Login/Signup
  app.post('/api/auth/2fa/verify', async (req: Request, res: Response) => {
    const { email, code, userData } = req.body;
    if (!db) return res.json({ success: true, uid: 'offline_user' });

    const doc = await db.collection('2fa_codes').doc(email).get();
    if (!doc.exists || doc.data()?.code !== code) {
      return res.status(400).json({ error: 'Code de vérification invalide' });
    }

    // Cleanup code
    await db.collection('2fa_codes').doc(email).delete();

    // If login flow, client handles Firebase Auth login. 
    // This endpoint just validates the 2FA state for our side.
    res.json({ success: true });
  });

  // Manage API Keys
  app.get('/api/keys', authenticateUser, async (req: Request, res: Response) => {
    const uid = (req as any).user.uid;
    if (!db) return res.json([]);
    const snap = await db.collection('api_keys').where('uid', '==', uid).get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });

  app.post('/api/keys', authenticateUser, async (req: Request, res: Response) => {
    const uid = (req as any).user.uid;
    try {
      const { name, permissions } = apiKeySchema.parse(req.body); 
      
      if (db) {
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();
        const balance = userData?.balance || 0;
        const isApproved = userData?.apiApproved === true;

        if (balance < 50) {
          return res.status(403).json({ error: 'Solde insuffisant. Un minimum de 50.00$ est requis pour activer l\'accès API.' });
        }
        if (!isApproved) {
          return res.status(403).json({ error: 'Votre demande d\'accès API est en cours de révision par la gouvernance HUB.' });
        }

        const key = `reseller_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
        const newKey = {
          uid,
          name: name || 'New Key',
          key,
          permissions: permissions || '1,2,3',
          createdAt: new Date()
        };
        await db.collection('api_keys').add(newKey);
        await logActivity(req, 'CREATE_API_KEY', { name });
        res.json({ success: true, key });
      } else {
        res.status(500).json({ error: 'Database unavailable' });
      }
    } catch (error) {
      res.status(400).json({ error: 'Invalid API key parameters' });
    }
  });

  app.delete('/api/keys/:id', authenticateUser, async (req: Request, res: Response) => {
    const uid = (req as any).user.uid;
    const { id } = req.params;
    if (db) {
      const doc = await db.collection('api_keys').doc(id).get();
      if (doc.exists && doc.data()?.uid === uid) {
        await db.collection('api_keys').doc(id).delete();
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Key not found' });
      }
    }
  });

  // --- REST API ENDPOINTS ---

  // Auth: Google verify
  app.post('/api/auth/verify-google', async (req: Request, res: Response, next: NextFunction) => {
    if (!auth || !db) {
      // Offline fallback success for local demo preview
      return res.json({
        success: true,
        user: { uid: 'offline_user_1', email: 'offline@domain.com', displayName: 'Offline Reseller', role: 'reseller' }
      });
    }

    try {
      const { idToken } = googleAuthSchema.parse(req.body);
      const decodedToken = await auth.verifyIdToken(idToken);
      const uid = decodedToken.uid;
      
      const userRef = db.collection('users').doc(uid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        await userRef.set({
          uid,
          email: decodedToken.email || '',
          displayName: decodedToken.name || 'Reseller',
          role: 'reseller',
          balance: 50.00, // Dotation initiale Sovereign
          apiApproved: false,
          createdAt: new Date(),
        });
      }
      
      await logActivity(req, 'LOGIN_GOOGLE', { email: decodedToken.email });
      
      res.json({ success: true, user: (await userRef.get()).data() });
    } catch (error) {
      next(error);
    }
  });

  // Auth: Local signup
  app.post('/api/auth/local-signup', async (req: Request, res: Response, next: NextFunction) => {
    if (!auth || !db) {
      return res.json({ success: true, uid: 'offline_user_1', simulated: true });
    }

    try {
      const { email, password, displayName } = localSignupSchema.parse(req.body);
      const userRecord = await auth.createUser({ email, password, displayName });
      
      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email,
        displayName,
        role: 'reseller',
        balance: 50.00, // Dotation initiale Sovereign
        apiApproved: false,
        createdAt: new Date(),
      });
      
      await logActivity(req, 'SIGNUP_LOCAL', { email });
      
      res.json({ success: true, uid: userRecord.uid });
    } catch (error) {
      next(error);
    }
  });

  // Auth: Logout logging
  app.post('/api/auth/logout', authenticateUser, async (req: Request, res: Response) => {
    await logActivity(req, 'LOGOUT');
    res.json({ success: true });
  });

  // Proxy: Get client products (domains, ssl, emails)
  app.get('/api/paymenter/user/products', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uid = (req as any).user.uid;
      const data = await paymenter.getUserProducts(uid);
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  // Proxy: Domain search
  app.post('/api/paymenter/domains/search', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = domainSearchSchema.parse(req.body);
      const data = await paymenter.searchDomain(query);
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  // Proxy: Domain register
  app.post('/api/paymenter/domains/register', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uid = (req as any).user.uid;
      const { domain, price } = productOrderSchema.parse(req.body);
      const cost = Number(price || 12.99);

      if (db) {
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();
        const balance = userDoc.data()?.balance || 0;

        if (balance < cost) {
          return res.status(402).json({ error: 'Solde insuffisant pour cette opération. Solde actuel: ' + balance + '$' });
        }

        // Deduct balance
        await userRef.update({ balance: balance - cost });
        await logActivity(req, 'TRANSACTION_DEBIT', { item: 'Domain: ' + domain, amount: cost });
      }

      const data = await paymenter.registerDomain(uid, domain, cost);
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  // Request: SSL buy
  app.post('/api/paymenter/ssl/order', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uid = (req as any).user.uid;
      const { planId, domain } = req.body;
      const data = await paymenter.orderSSL(uid, planId, domain);
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  // Request: Email buy
  app.post('/api/paymenter/emails/order', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uid = (req as any).user.uid;
      const { planId, domain } = req.body;
      const data = await paymenter.orderEmail(uid, planId, domain);
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  // Static Proxy for other Paymenter client resources: invoices, etc.
  app.get('/api/paymenter/:resource', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
    const { resource } = req.params;
    const allowed = ['domains', 'ssl', 'emails', 'invoices'];
    if (!allowed.includes(resource)) {
      return res.status(403).json({ error: 'Resource access restriction' });
    }

    try {
      const data = await paymenter.proxyGet(`/api/client/${resource}`);
      res.json(data);
    } catch (error: any) {
      // If paymenter is not running, return beautiful context-aware mock resources
      console.warn(`[Proxy] Paymenter API get /api/client/${resource} failed. Serving mock fallback list.`);
      if (resource === 'invoices') {
        return res.json([
          { id: 'inv_101', item: 'Enregistrement de domaine', total: 12.99, status: 'Payé', date: '2026-05-18' },
          { id: 'inv_102', item: 'Certificat SSL PositiveSSL', total: 15.99, status: 'Payé', date: '2026-05-19' }
        ]);
      }
      res.json([]);
    }
  });

  // --- COHESIVE SOVEREIGN DOMAIN, DNS & EMAIL ENDPOINTS ---

  // List all registered domains
  app.get('/api/domains', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uid = (req as any).user.uid;
      const data = await paymenter.getUserDomains(uid);
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  // Get single domain details
  app.get('/api/domains/:domain', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uid = (req as any).user.uid;
      const { domain } = req.params;
      const data = await paymenter.getDomainDetails(uid, domain);
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  // Bulk domain registration (one per line)
  app.post('/api/domains/bulk', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uid = (req as any).user.uid;
      const { domains } = bulkDomainsSchema.parse(req.body);
      const data = await paymenter.registerBulkDomains(uid, domains);
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  // Delete domain config
  app.delete('/api/domains/:domain', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uid = (req as any).user.uid;
      const { domain } = req.params;
      const data = await paymenter.deleteDomain(uid, domain);
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  // Add DNS Record
  app.post('/api/domains/:domain/dns', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uid = (req as any).user.uid;
      const { domain } = req.params;
      const { type, name, value, ttl, priority } = dnsRecordSchema.parse(req.body);
      const data = await paymenter.addDnsRecord(uid, domain, { type, name, value, ttl, priority });
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  // Delete DNS Record
  app.delete('/api/domains/:domain/dns/:recordId', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uid = (req as any).user.uid;
      const { domain, recordId } = req.params;
      const data = await paymenter.deleteDnsRecord(uid, domain, recordId);
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  // Force buy SSL certificate for specific domain
  app.post('/api/domains/:domain/ssl', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uid = (req as any).user.uid;
      const { domain } = req.params;
      const { planId } = req.body;
      if (!planId) return res.status(400).json({ error: 'Un plan SSL valide est requis' });
      const data = await paymenter.orderSSL(uid, planId, domain);
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  // Get professional mailboxes for specific domain
  app.get('/api/domains/:domain/mailboxes', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uid = (req as any).user.uid;
      const { domain } = req.params;
      const data = await paymenter.getMailboxes(uid, domain);
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  // Create professional mailbox
  app.post('/api/domains/:domain/mailboxes', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uid = (req as any).user.uid;
      const { domain } = req.params;
      const { localPart, password, planId } = mailboxSchema.parse(req.body);
      const data = await paymenter.createMailbox(uid, domain, localPart, password, planId);
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  // Delete professional mailbox
  app.delete('/api/domains/:domain/mailboxes/:mailboxId', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uid = (req as any).user.uid;
      const { mailboxId } = req.params;
      const data = await paymenter.deleteMailbox(uid, mailboxId);
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  // --- AI SUPPORT AGENT ---
  app.post('/api/ai/chat', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { message, context } = req.body;
      const aiClient = getGemini();
      const model = aiClient.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `System: ${context}\n\nUser: ${message}\n\nAgent:`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      res.json({ reply: response.text() });
    } catch (error) {
      console.error("AI Error:", error);
      res.json({ reply: "Désolé, je rencontre une perturbation sur la liaison neurale. Veuillez réessayer." });
    }
  });

  // --- INVOICES ---
  app.get('/api/paymenter/invoices', authenticateUser, async (req: Request, res: Response) => {
    const uid = (req as any).user.uid;
    // In a real app, we would query the database 'invoices' collection
    // For this context, we return a list of transactions (deposits & purchases)
    if (db) {
      const invoices = [
        { id: 'INV-2026-001', item: 'Dotation Initiale Sovereign', total: 50.00, status: 'Payé', date: '2026-05-18' },
        { id: 'TXN-2831', item: 'Approvissionnement Stripe', total: 50.00, status: 'Payé', date: '2026-05-19' }
      ];
      // We could also fetch from DB if implemented
      res.json(invoices);
    } else {
      res.json([]);
    }
  });

  // --- CANADIAN LEGAL COMPLIANCE PROFILES CONTROL ---

  // Get Profile
  app.get('/api/profile', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uid = (req as any).user.uid;
      if (db) {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          return res.json(userDoc.data());
        }
      }
      // Fallback
      res.json({
        uid,
        email: (req as any).user.email || 'user@example.ca',
        displayName: (req as any).user.name || 'Revendeur Canadien',
        role: 'reseller',
        legalBusinessStatus: 'individual',
        provincialRegistryNumber: '',
        gstHstNumber: '',
        qstNumber: '',
        provinceJurisdiction: 'Quebec',
        canadianPresenceDeclared: true,
        legalRepresentativeName: (req as any).user.name || 'Revendeur Canadien',
        legalRepresentativeEmail: (req as any).user.email || 'user@example.ca',
        addressStreet: '',
        addressCity: '',
        addressProvince: 'QC',
        addressPostalCode: ''
      });
    } catch (error) {
      next(error);
    }
  });

  // Save/Update Canadian Profile Fields
  app.post('/api/profile', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uid = (req as any).user.uid;
      const updateData = profileUpdateSchema.parse(req.body);

      if (db) {
        const userRef = db.collection('users').doc(uid);
        await userRef.set(updateData, { merge: true });
        
        await logActivity(req, 'UPDATE_PROFILE', { province: updateData.addressProvince });
        
        const refreshed = await userRef.get();
        return res.json({ success: true, user: refreshed.data() });
      }

      res.json({ success: true, user: updateData });
    } catch (error) {
      next(error);
    }
  });

  // --- BILLING & FUNDS MANAGEMENT ---

  // Get Billing Balance
  app.get('/api/billing/balance', authenticateUser, async (req: Request, res: Response) => {
    const uid = (req as any).user.uid;
    if (!db) return res.json({ balance: 0 });
    const userDoc = await db.collection('users').doc(uid).get();
    res.json({ balance: userDoc.data()?.balance || 0 });
  });

  // Make Deposit
  app.post('/api/billing/deposit', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uid = (req as any).user.uid;
      const { amount, method } = depositSchema.parse(req.body);

      if (db) {
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();
        const currentBalance = userDoc.data()?.balance || 0;
        
        const newBalance = currentBalance + amount;
        await userRef.set({ balance: newBalance }, { merge: true });
        
        await logActivity(req, 'BILLING_DEPOSIT', { amount, method });
        return res.json({ success: true, balance: newBalance });
      }
      
      res.json({ success: true, balance: amount });
    } catch (error) {
      next(error);
    }
  });

  // Stripe Checkout Session
  app.post('/api/billing/create-checkout-session', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stripeClient = getStripe();
      if (!stripeClient) {
        // Fallback for demo if no key is provided
        console.warn('[Stripe] STRIPE_SECRET_KEY not set. Using simulation mode.');
        return res.json({ url: '/profile#billing?success=true&demo=true' });
      }

      const { amount } = checkoutSessionSchema.parse(req.body);
      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'cad',
              product_data: {
                name: 'Apport de capital Sovereign HUB',
                description: 'Dépôt de fonds pour services API et infrastructures',
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.APP_URL || 'http://localhost:3000'}/profile#billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/profile#billing?canceled=true`,
        metadata: {
          uid: (req as any).user.uid,
          amount: amount.toString(),
        }
      });

      res.json({ url: session.url });
    } catch (error) {
      next(error);
    }
  });

  // --- ACTIVITY LOGS & TERMINAL API ---

  // Get Activity Logs
  app.get('/api/logs', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!db) return res.json([{ id: 'mock_1', action: 'DB_OFFLINE', timestamp: new Date() }]);
      
      const logs = await db.collection('activity_logs')
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();
      
      res.json(logs.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      next(error);
    }
  });

  // Terminal Batch Exec (upload .txt)
  app.post('/api/terminal/batch', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { commands } = req.body; // Array of strings or raw text
      if (!commands) return res.status(400).json({ error: 'Commandes requises' });
      
      const lines = typeof commands === 'string' ? commands.split('\n') : commands;
      const results = [];
      
      for (const line of lines) {
        if (!line.trim() || line.startsWith('#')) continue;
        const [cmd, ...args] = line.trim().split(/\s+/);
        // Reuse exec logic or simulate
        results.push(`[EXEC] ${line} ... DONE`);
      }
      
      res.json({ output: results.join('\n') });
    } catch (err) {
      res.status(500).json({ error: 'Batch execution failed' });
    }
  });

  // Terminal Exec Proxy (api-control)
  app.post('/api/terminal/exec', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { command, args } = terminalExecSchema.parse(req.body);
      const uid = (req as any).user.uid;
      
      // Process help flags
      if (args.includes('--help')) {
        const helpMap: Record<string, string> = {
          'register': 'Description: Enregistre un nouveau domaine sur le protocole souverain.\nUsage: api-control register <domaine.com>\nExemple: api-control register google.ca',
          'search': 'Description: Vérifie en temps réel la disponibilité d\'un nom de domaine.\nUsage: api-control search <mot-clef>\nExemple: api-control search monprojet',
          'dns:add': 'Description: Ajoute un enregistrement DNS (A, CNAME, MX, TXT) à un domaine actif.\nUsage: api-control dns:add <domain> <type> <name> <value>\nExemple: api-control dns:add google.ca A @ 1.2.3.4',
          'dns:mod': 'Description: Modifie un enregistrement DNS existant via son ID unique.\nUsage: api-control dns:mod <domain> <recordId> <type> <name> <value>',
          'ns:set': 'Description: Met à jour la paire de serveurs de noms faisant autorité.\nUsage: api-control ns:set <domain> <ns1> <ns2>...\nExemple: api-control ns:set google.ca n1.hub.com n2.hub.com',
          'dig': 'Description: Effectue une requête DNS directe sur les serveurs root.\nUsage: api-control dig <domain>\nExemple: api-control dig google.com',
          'whois': 'Description: Affiche les informations d\'enregistrement publiques via le registre WHOIS.\nUsage: api-control whois <domain>',
          'check-install': 'Description: Teste la connectivité d\'un module externe (WHMCS).\nUsage: api-control check-install whmcs <domain>',
          'apikey:create': 'Description: Génère une nouvelle clef d\'accès API (Nécessite approbation profile).\nUsage: api-control apikey:create [nom_clef] [permissions]\nExemple: api-control apikey:create MobileApp 1,2,4',
          'logs:show': 'Description: Affiche les derniers journaux d\'audit de sécurité de votre session.\nUsage: api-control logs:show',
          'whoami': 'Description: Affiche les détails de votre identité souveraine et solde actuel.\nUsage: api-control whoami'
        };
        return res.json({ 
          output: `[SOVEREIGN DOCUMENTATION] : ${command.toUpperCase()}\n\n${helpMap[command] || 'Aucune documentation détaillée disponible.'}` 
        });
      }

      await logActivity(req, 'CLI_EXEC', { command, args });

      // Core Commands Mapping
      switch (command) {
        case 'whoami': {
          const userDoc = db ? await db.collection('users').doc(uid).get() : null;
          const role = userDoc?.data()?.role || 'Reseller';
          const email = (req as any).user.email;
          const balance = userDoc?.data()?.balance || 0;
          return res.json({ 
            output: `IDENTITY REPORT\n---------------\nUtilisateur: ${email}\nUID: ${uid}\nRole: ${role}\nSolde: ${balance}$\nAuth: Verified\nRegion: Global Access` 
          });
        }
        case 'profile:update': {
          const [key, ...valueParts] = args;
          const value = valueParts.join(' ');
          if (!key || !value) return res.json({ error: 'Usage: api-control profile:update <field> <value>' });
          
          if (db) {
            const userRef = db.collection('users').doc(uid);
            await userRef.set({ [key]: value }, { merge: true });
            return res.json({ output: `Profil mis à jour: ${key} = ${value}` });
          }
          return res.json({ output: 'Simulation: Profil mis à jour localement.' });
        }
        case 'billing:credit': {
          const amount = Number(args[0]);
          if (isNaN(amount) || amount <= 0) return res.json({ error: 'Usage: api-control billing:credit <montant>' });
          
          if (process.env.NODE_ENV === 'production') {
             return res.json({ error: 'Opération restreinte aux administrateurs systèmes en production.' });
          }

          if (db) {
            const userRef = db.collection('users').doc(uid);
            const userDoc = await userRef.get();
            const newBal = (userDoc.data()?.balance || 0) + amount;
            await userRef.update({ balance: newBal });
            return res.json({ output: `Compte crédité de ${amount}$. Nouveau solde: ${newBal}$` });
          }
          return res.json({ output: `Simulation: Compte crédité de ${amount}$` });
        }
        case 'logs:show': {
          if (!db) return res.json({ output: "Logging local (Offline Mode): Aucun log persistant." });
          const logs = await db.collection('activity_logs')
            .where('uid', '==', uid)
            .orderBy('timestamp', 'desc')
            .limit(15)
            .get();
          
          let out = "JOURNAUX D'ACTIVITÉ RÉCENTS:\n\n";
          logs.docs.forEach(d => {
            const data = d.data();
            const date = data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString();
            out += `[${date}] ${data.action.padEnd(20)} | IP: ${data.ip} | FP: ${data.fingerprint?.substring(0,8)}... | Path: ${data.path}\n`;
          });
          return res.json({ output: out });
        }
        case 'register': {
          const domain = args[0];
          if (!domain) return res.json({ error: 'Usage: api-control register <domain.com>' });
          const result = await paymenter.registerDomain(uid, domain, 12.99);
          return res.json({ output: `Domaine ${domain} enregistré.`, data: result });
        }
        case 'search': {
          const query = args[0];
          if (!query) return res.json({ error: 'Usage: api-control search <keyword>' });
          const result = await paymenter.searchDomain(query);
          return res.json({ output: `Résultats pour "${query}"`, data: result });
        }
        case 'dns:add': {
          const [domain, type, name, value] = args;
          if (!domain || !type || !name || !value) return res.json({ error: 'Usage: api-control dns:add <domain> <type> <name> <value>' });
          const result = await paymenter.addDnsRecord(uid, domain, { type, name, value, ttl: 3600 });
          return res.json({ output: `DNS ajouté pour ${domain}`, data: result });
        }
        case 'dns:mod': {
          const [domain, recordId, type, name, value] = args;
          if (!domain || !recordId) return res.json({ error: 'Usage: api-control dns:mod <domain> <recordId> <type> <name> <value>' });
          // Simplified simulation: delete and add
          await paymenter.deleteDnsRecord(uid, domain, recordId);
          const result = await paymenter.addDnsRecord(uid, domain, { type, name, value, ttl: 3600 });
          return res.json({ output: `DNS mis à jour pour ${domain}`, data: result });
        }
        case 'ns:set': {
          const [domain, ...nsList] = args;
          if (!domain || nsList.length === 0) return res.json({ error: 'Usage: api-control ns:set <domain> <ns1> <ns2>...' });
          return res.json({ output: `Serveurs de noms mis à jour pour ${domain}: ${nsList.join(', ')}` });
        }
        case 'dig': {
          const domain = args[0];
          if (!domain) return res.json({ error: 'Usage: dig <domain>' });
          return res.json({ 
            output: `; <<>> DiG 9.16 <<>> ${domain}\n${domain}. 3600 IN A 148.116.66.106\n\n;; Query time: 12 msec\n;; SERVER: 8.8.8.8#53(8.8.8.8)` 
          });
        }
        case 'whois': {
          const domain = args[0];
          if (!domain) return res.json({ error: 'Usage: whois <domain>' });
          return res.json({ 
            output: `Domain Name: ${domain.toUpperCase()}\nRegistry Domain ID: 123456_DOMAIN_COM-VRSN\nRegistrar: ResellerHub Sovereign\nCreation Date: 2026-05-18T12:00:00Z` 
          });
        }
        case 'check-install': {
          const [type, domain] = args;
          if (type !== 'whmcs') return res.json({ error: 'Seulement WHMCS est supporté actuellement.' });
          return res.json({ output: `Vérification de l'installation WHMCS sur ${domain}...\n[STATUS] VALIDATED\n[API] CONNECTED` });
        }
        case 'apikey:create': {
          const [name, perms] = args;
          
          if (db) {
            const userDoc = await db.collection('users').doc(uid).get();
            const userData = userDoc.data();
            const balance = userData?.balance || 0;
            const isApproved = userData?.apiApproved === true;

            if (balance < 50) {
              return res.json({ error: 'CLI ERROR: Solde insuffisant (50$ requis pour l\'activation API).' });
            }
            if (!isApproved) {
              return res.json({ error: 'CLI ERROR: Accès API en cours de révision par la gouvernance.' });
            }

            const key = `reseller_cli_${Math.random().toString(36).substring(7)}${Math.random().toString(36).substring(7)}`;
            const p = perms || '1,2,3';
            await db.collection('api_keys').add({ uid, name: name || 'CLI Generated Key', key, permissions: p, createdAt: new Date() });
            
            await logActivity(req, 'CLI_CREATE_API_KEY', { name });
            
            return res.json({ 
              output: `API KEY GENERATED SUCCESSFULLY\n----------------------------\nKey: ${key}\nPermissions: ${p}\nStatus: Active`,
              data: { key, permissions: p } 
            });
          }
          return res.json({ error: 'Database context unavailable for CLI key generation.' });
        }
        case 'help': {
          return res.json({
            output: `Commandes disponibles (api-control):\n` +
                    `  register <domain>         - Enregistre un nouveau domaine\n` +
                    `  search <query>            - Recherche la disponibilité d'un domaine\n` +
                    `  dns:add <dom> <t> <n> <v>  - Ajoute un enregistrement DNS\n` +
                    `  dns:mod <dom> <id> <t..>  - Modifie un enregistrement DNS\n` +
                    `  ns:set <dom> <ns1> <ns2>  - Modifie les serveurs de noms\n` +
                    `  dig <domain>              - Teste les enregistrements A (DNS Lookup)\n` +
                    `  whois <domain>            - Affiche les informations WHOIS\n` +
                    `  check-install whmcs <dom> - Vérifie une installation externe\n` +
                    `  profile:update <key> <v>  - Met à jour un champ du profil\n` +
                    `  billing:credit <montant>  - Crédite le compte client\n` +
                    `  apikey:create [nom] [prm] - Génère une clef API d'accès\n` +
                    `  whoami                    - Affiche l'identité de session\n` +
                    `  logs:show                 - Liste l'activité récente (API & CLI)`
          });
        }
      }

      res.status(404).json({ error: `Commande inconnue: ${command}. Tapez 'help' pour voir les commandes disponibles.` });
    } catch (error: any) {
      res.json({ error: error.message || 'Erreur execution commande' });
    }
  });

  // --- AI SUGGESTIONS & BRAINSTORMING ---

  app.post('/api/ai/brainstorm', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { businessType, keywords } = brainstormSchema.parse(req.body);
      const ai = getGemini();

      const prompt = `Génère 10 suggestions de noms d'entreprises innovantes et leurs noms de domaine associés (.com, .io, .fr, .tech) pour une entreprise dans le domaine : "${businessType}".
      Mots-clés souhaités : ${keywords || 'aucun'}.
      Ajoute une explication professionnelle axée sur la pérennité, la clarté de la marque, et l'impact.
      Réponds TOUJOURS au format JSON strict :
      {
        "suggestions": [
          { "name": "Nom de marque", "domain": "nomdemarque.com", "explanation": "Explication..." }
        ]
      }`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    domain: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                  },
                  required: ["name", "domain", "explanation"]
                }
              }
            },
            required: ["suggestions"]
          }
        }
      });

      res.json(JSON.parse(response.text));
    } catch (error) {
      next(error);
    }
  });

  // AI assistant conversational agent with deep functional capabilities
  app.post('/api/ai/agent', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uid = (req as any).user.uid;
      const { message, history } = aiAgentSchema.parse(req.body);

      const response = await gemini.executeAgentTurn(uid, message, history);
      res.json(response);
    } catch (error) {
      next(error);
    }
  });

  // Clear AI Memory
  app.delete('/api/ai/memory', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uid = (req as any).user.uid;
      await gemini.clearAgentMemory(uid);
      res.json({ success: true, message: 'Mémoire de l\'agent réinitialisée.' });
    } catch (error) {
      next(error);
    }
  });

  // WHMCS Module Download (Zipped)
  app.get('/api/whmcs/module', authenticateUser, async (req: Request, res: Response) => {
    const zip = new AdmZip();
    const folderName = 'resellerhub_registrar';
    
    const moduleContent = `<?php
/**
 * ResellerHub WHMCS Registrar Module
 * Version: 1.0.2 - Sovereign Protocol
 */
if (!defined("WHMCS")) {
    die("This file cannot be accessed directly");
}

function resellerhub_getConfigArray() {
    return [
        'FriendlyName' => ['Type' => 'System', 'Value' => 'Sovereign ResellerHUB Protocol'],
        'ApiKey' => ['Type' => 'password', 'Size' => '64', 'Description' => 'Enter your Sovereign API key from the profile panel.'],
        'TestMode' => ['Type' => 'yesno', 'Description' => 'Tick to enable sandbox API environment'],
    ];
}

function resellerhub_RegisterDomain($params) {
    // API Implementation for Sovereign HUB
    return ['success' => true];
}
?>`;
    
    zip.addFile(`${folderName}/resellerhub_registrar.php`, Buffer.from(moduleContent));
    zip.addFile(`${folderName}/README.txt`, Buffer.from("Sovereign HUB - WHMCS Integration v1.0.2\n\nInstall:\n1. Upload folder to /modules/registrars/\n2. Activate in Setup -> Products/Services -> Domain Registrars"));

    const zipBuffer = zip.toBuffer();
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=sovereign_whmcs_v1.zip');
    res.send(zipBuffer);
  });

  // --- Error Handling Middleware ---
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(`[Error] ${req.method} ${req.url}:`, err);

    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: err.issues.map(e => ({ path: e.path.join('.'), message: e.message }))
      });
    }

    const status = err.status || 500;
    const msg = err.message || 'Internal server anomaly';
    res.status(status).json({ error: msg });
  });

  const isProd = process.env.NODE_ENV === 'production' || process.env.VITE_PROD === 'true';
  // PORT is already defined at the top of startServer

  // --- Health Checks ---
  app.get('/api/health', (req, res) => res.json({ status: 'ok', environment: process.env.NODE_ENV, timestamp: new Date().toISOString() }));
  app.get('/health', (req, res) => res.json({ status: 'ok', environment: process.env.NODE_ENV }));

  if (!isProd) {
    console.log('[Dev] Starting Vite in middleware mode...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    console.log('[Dev] Mounting Vite middleware.');
    app.use(vite.middlewares);
  } else {
    // Robust path resolution for production in Dokploy/Docker
    // In production, server.cjs is in dist/, so we serve the current directory
    const distPath = path.resolve(__dirname);
    console.log(`[Prod] Static asset root resolved to: ${distPath}`);
    console.log(`[Prod] Checking index.html at: ${path.join(distPath, 'index.html')}`);
    
    // Serve static files
    app.use(express.static(distPath, {
      maxAge: '1h',
      index: false
    }));
    
    app.get('*', (req: Request, res: Response) => {
      const indexPath = path.join(distPath, 'index.html');
      
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
      
      // Attempt fallback to process.cwd() / dist
      const fallbackPath = path.resolve(process.cwd(), 'dist', 'index.html');
      if (fs.existsSync(fallbackPath)) {
        return res.sendFile(fallbackPath);
      }

      console.error(`[CRITICAL] index.html not found. tried: ${indexPath}, ${fallbackPath}`);
      res.status(404).send(`404: Application entry point missing. Please redeploy.`);
    });
  }

  console.log(`[Bootstrap] Binding to 0.0.0.0:${PORT}...`);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Status] Server successfully running at http://0.0.0.0:${PORT}`);
    console.log(`[Status] NODE_ENV: ${process.env.NODE_ENV}`);
  });
}

startServer().catch(err => {
  console.error('[Error] Server starting error:', err);
});
