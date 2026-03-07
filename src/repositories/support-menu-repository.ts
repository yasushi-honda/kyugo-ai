import { Timestamp } from "@google-cloud/firestore";
import { firestore } from "../config.js";
import { SupportMenu } from "../types.js";

const COLLECTION = "supportMenus";

function menusRef() {
  return firestore.collection(COLLECTION);
}

export async function getSupportMenu(id: string): Promise<SupportMenu | null> {
  const doc = await menusRef().doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as SupportMenu;
}

export async function listSupportMenus(category?: string): Promise<SupportMenu[]> {
  let query: FirebaseFirestore.Query = menusRef();
  if (category) {
    query = query.where("category", "==", category);
  }
  const snapshot = await query.orderBy("name").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as SupportMenu);
}

export async function upsertSupportMenu(id: string, data: Omit<SupportMenu, "id" | "updatedAt">): Promise<SupportMenu> {
  const now = Timestamp.now();
  const menuData = { ...data, updatedAt: now };
  await menusRef().doc(id).set(menuData, { merge: true });
  return { id, ...menuData };
}
