import { describe, it, expect, vi, beforeEach } from "vitest";

vi.unmock("./api");
import { api } from "./api";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(status: number, body: { error: string }) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("api.listCases", () => {
  it("fetches cases without staffId (server determines from auth)", async () => {
    const cases = [{ id: "case-1", clientName: "山田太郎" }];
    mockFetch.mockResolvedValue(jsonResponse(cases));

    const result = await api.listCases();

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/cases",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer mock-token",
        }),
      }),
    );
    expect(result).toEqual(cases);
  });
});

describe("api.getCase", () => {
  it("fetches a single case by id", async () => {
    const caseData = { id: "case-1", clientName: "山田太郎" };
    mockFetch.mockResolvedValue(jsonResponse(caseData));

    const result = await api.getCase("case-1");

    expect(mockFetch).toHaveBeenCalledWith("/api/cases/case-1", expect.any(Object));
    expect(result).toEqual(caseData);
  });
});

describe("api.createCase", () => {
  it("sends POST with JSON body (no assignedStaffId)", async () => {
    const input = {
      clientName: "山田太郎",
      clientId: "client-001",
      dateOfBirth: "1990-01-01",
    };
    mockFetch.mockResolvedValue(jsonResponse({ id: "case-1", ...input }));

    await api.createCase(input);

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/cases");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(input);
    expect(init.headers["Content-Type"]).toBe("application/json");
  });
});

describe("api.updateCaseStatus", () => {
  it("sends PATCH with status", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ id: "case-1", status: "closed" }));

    await api.updateCaseStatus("case-1", "closed");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/cases/case-1/status");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ status: "closed" });
  });
});

describe("api.createConsultation", () => {
  it("sends POST with consultation data (no staffId)", async () => {
    const data = { content: "相談内容", consultationType: "counter" };
    mockFetch.mockResolvedValue(jsonResponse({ id: "cons-1", ...data }));

    await api.createConsultation("case-1", data);

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/cases/case-1/consultations");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(data);
  });
});

describe("api.createAudioConsultation", () => {
  it("sends FormData without Content-Type header", async () => {
    const formData = new FormData();
    formData.append("audio", new Blob(["audio-data"]), "test.wav");
    mockFetch.mockResolvedValue(jsonResponse({ id: "cons-1", transcript: "text" }));

    await api.createAudioConsultation("case-1", formData);

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/cases/case-1/consultations/audio");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(formData);
    expect(init.headers["Content-Type"]).toBeUndefined();
  });
});

describe("api.listSupportMenus", () => {
  it("fetches support menus", async () => {
    const menus = [{ id: "menu-1", name: "生活保護" }];
    mockFetch.mockResolvedValue(jsonResponse(menus));

    const result = await api.listSupportMenus();

    expect(mockFetch).toHaveBeenCalledWith("/api/support-menus", expect.any(Object));
    expect(result).toEqual(menus);
  });
});

describe("error handling", () => {
  it("throws Error with server error message", async () => {
    mockFetch.mockResolvedValue(errorResponse(400, { error: "Invalid input" }));

    await expect(api.listCases()).rejects.toThrow("Invalid input");
  });

  it("throws Error with status text when no error field", async () => {
    mockFetch.mockResolvedValue(
      new Response("not json", { status: 500, statusText: "Internal Server Error" }),
    );

    await expect(api.listCases()).rejects.toThrow("Internal Server Error");
  });
});
