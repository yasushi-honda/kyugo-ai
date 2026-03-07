import { describe, it, expect } from "vitest";

describe("kyugo-ai", () => {
  it("environment variables have defaults", () => {
    const PROJECT_ID = process.env.GCP_PROJECT_ID ?? "kyugo-ai-dev";
    const REGION = process.env.GCP_REGION ?? "asia-northeast1";
    const MODEL = process.env.VERTEX_AI_MODEL ?? "gemini-2.5-flash";

    expect(PROJECT_ID).toBe("kyugo-ai-dev");
    expect(REGION).toBe("asia-northeast1");
    expect(MODEL).toBe("gemini-2.5-flash");
  });
});
