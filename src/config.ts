import { VertexAI } from "@google-cloud/vertexai";
import { Firestore } from "@google-cloud/firestore";
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export const PROJECT_ID = process.env.GCP_PROJECT_ID ?? "kyugo-ai-dev";
export const REGION = process.env.GCP_REGION ?? "asia-northeast1";
export const MODEL = process.env.VERTEX_AI_MODEL ?? "gemini-2.5-flash";

export const firestore = new Firestore({
  projectId: PROJECT_ID,
  databaseId: "(default)",
});

export const vertexAI = new VertexAI({
  project: PROJECT_ID,
  location: REGION,
});

export const generativeModel = vertexAI.getGenerativeModel({ model: MODEL });

// Firebase Admin SDK initialization
const firebaseAdminApp = initializeApp({
  credential: process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
    : applicationDefault(),
  projectId: PROJECT_ID,
});

export const firebaseAuth = getAuth(firebaseAdminApp);
