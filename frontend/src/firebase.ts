import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// E2Eテスト用: Auth Emulator接続 + テストヘルパー公開（本番ビルドには含まれない）
if (import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST) {
  import("firebase/auth").then(({ connectAuthEmulator, signInWithEmailAndPassword }) => {
    connectAuthEmulator(auth, import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST);
    (window as unknown as Record<string, unknown>).__e2eSignIn = (email: string, password: string) =>
      signInWithEmailAndPassword(auth, email, password);
  });
}
