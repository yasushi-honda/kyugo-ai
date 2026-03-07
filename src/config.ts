import { VertexAI } from "@google-cloud/vertexai";
import { Firestore } from "@google-cloud/firestore";

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
