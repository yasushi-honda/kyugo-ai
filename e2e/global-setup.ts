export const AUTH_EMULATOR_HOST = "http://127.0.0.1:9099";
export const E2E_PROJECT_ID = "demo-e2e";
export const TEST_EMAIL = "e2e-test@example.com";
export const TEST_PASSWORD = "e2e-test-password-123";

export default async function globalSetup() {
  // Auth Emulatorが起動済みか確認
  try {
    const health = await fetch(`${AUTH_EMULATOR_HOST}/`);
    if (!health.ok) throw new Error("Auth Emulator not responding");
  } catch (e) {
    throw new Error(
      `Firebase Auth Emulator is not running (${e instanceof Error ? e.message : e}). Start it with: firebase emulators:start --only auth --project ${E2E_PROJECT_ID}`,
    );
  }

  // 既存ユーザーをクリア（冪等性確保）
  await fetch(
    `${AUTH_EMULATOR_HOST}/emulator/v1/projects/${E2E_PROJECT_ID}/accounts`,
    { method: "DELETE" },
  );

  // テストユーザーを作成
  const res = await fetch(
    `${AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        returnSecureToken: true,
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create test user: ${res.status} ${body}`);
  }
}
