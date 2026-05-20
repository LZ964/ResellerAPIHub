import path from 'path';
import fs from 'fs';
import * as admin from 'firebase-admin';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Load Firebase Config
let firebaseAdminApp: admin.app.App | null = null;
let dbInstance: admin.firestore.Firestore | null = null;
let authInstance: admin.auth.Auth | null = null;

export function getFirebase() {
  if (!firebaseAdminApp) {
    try {
      const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(firebaseConfigPath)) {
        const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
        if (!admin.apps.length) {
          firebaseAdminApp = admin.initializeApp({
            projectId: firebaseConfig.projectId,
          });
          console.log('[Firebase] Admin initialized successfully.');
        } else {
          firebaseAdminApp = admin.app();
        }
        dbInstance = admin.firestore();
        authInstance = admin.auth();
      } else {
        console.warn('[Firebase] Warning: firebase-applet-config.json is missing. Local offline modes will be active.');
      }
    } catch (err) {
      console.error('[Firebase] Failed to initialize Firebase:', err);
    }
  }
  return { db: dbInstance, auth: authInstance };
}

// Lazy Gemini Initialization
let geminiClient: any = null;

export function getGemini(): any {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn('[Gemini] Warning: GEMINI_API_KEY is missing. Using empty/dummy model key.');
    }
    geminiClient = new (GoogleGenAI as any)({
      apiKey: key || 'dummy_api_key_placeholder'
    });
  }
  return geminiClient;
}

export const PAYMENTER_API_KEY = process.env.PAYMENTER_API_KEY;
export const PAYMENTER_URL = process.env.PAYMENTER_URL;
