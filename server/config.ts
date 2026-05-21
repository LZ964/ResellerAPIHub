import path from 'path';
import fs from 'fs';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
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
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const databaseId = process.env.FIREBASE_DATABASE_ID;
      
      if (projectId) {
        if (!admin.apps || !admin.apps.length) {
          firebaseAdminApp = admin.initializeApp({
            projectId: projectId,
          });
          console.log('[Firebase] Admin initialized successfully.');
        } else {
          firebaseAdminApp = admin.app();
        }
        dbInstance = getFirestore(firebaseAdminApp, databaseId);
        authInstance = getAuth(firebaseAdminApp);
      } else {
        console.warn('[Firebase] Warning: FIREBASE_PROJECT_ID env var is missing. Local offline modes will be active.');
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
