import { describe, it, expect } from "vitest";
import { VALID_STATUS_TRANSITIONS, CaseStatus } from "./types.js";

describe("VALID_STATUS_TRANSITIONS", () => {
  it("active can transition to referred or closed", () => {
    expect(VALID_STATUS_TRANSITIONS.active).toEqual(["referred", "closed"]);
  });

  it("referred can transition to active or closed", () => {
    expect(VALID_STATUS_TRANSITIONS.referred).toEqual(["active", "closed"]);
  });

  it("closed is terminal (no transitions)", () => {
    expect(VALID_STATUS_TRANSITIONS.closed).toEqual([]);
  });

  it("all statuses are covered", () => {
    const statuses: CaseStatus[] = ["active", "referred", "closed"];
    expect(Object.keys(VALID_STATUS_TRANSITIONS).sort()).toEqual(statuses.sort());
  });

  it("no status has a dead-end except closed", () => {
    for (const [status, transitions] of Object.entries(VALID_STATUS_TRANSITIONS)) {
      if (status !== "closed") {
        expect(transitions.length).toBeGreaterThan(0);
      }
    }
  });
});
