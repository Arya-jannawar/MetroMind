import { beforeEach, describe, expect, it, vi } from "vitest";

// Minimal localStorage shim so zustand/persist behaves exactly as in-browser.
const backing = new Map<string, string>();
function installLocalStorage() {
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => backing.get(k) ?? null,
    setItem: (k: string, v: string) => void backing.set(k, v),
    removeItem: (k: string) => void backing.delete(k),
    clear: () => backing.clear(),
    key: (i: number) => Array.from(backing.keys())[i] ?? null,
    get length() {
      return backing.size;
    },
  };
}

beforeEach(() => {
  backing.clear();
  installLocalStorage();
  vi.resetModules();
});

describe("persistence (localStorage-backed stores)", () => {
  it("rehydrates crowd reports after a simulated reload", async () => {
    // first session: write a report and persist
    const first = await import("@/store/crowd");
    first.useCrowdStore.getState().seed(1_753_382_400_000);
    first.useCrowdStore.getState().addReport("vanaz", "packed", 1_753_382_400_000);
    const stored = backing.get("metromind-crowd");
    expect(stored).toBeTruthy();

    // second session: fresh module graph, same storage
    vi.resetModules();
    installLocalStorage();
    const second = await import("@/store/crowd");
    const state = second.useCrowdStore.getState();
    expect(state.seededAt).toBe(1_753_382_400_000);
    const userReports = state.reports.filter((r) => r.source === "user");
    expect(userReports).toHaveLength(1);
    expect(userReports[0]).toMatchObject({ stationId: "vanaz", level: "packed" });
  });

  it("seeds demo data exactly once", async () => {
    const mod = await import("@/store/crowd");
    const now = 1_753_382_400_000;
    mod.useCrowdStore.getState().seed(now);
    const count = mod.useCrowdStore.getState().reports.length;
    expect(count).toBeGreaterThan(0);
    mod.useCrowdStore.getState().seed(now + 1000);
    expect(mod.useCrowdStore.getState().reports).toHaveLength(count);
  });

  it("persists rescue queue state (assign/resolve) across reloads", async () => {
    const first = await import("@/store/rescue");
    first.useRescueStore.getState().seed(1_753_382_400_000);
    const seededCount = first.useRescueStore.getState().incidents.length;
    expect(seededCount).toBeGreaterThanOrEqual(4);

    vi.resetModules();
    installLocalStorage();
    const second = await import("@/store/rescue");
    second.useRescueStore.getState().setStatus("inc-seed-1", "resolved");
    const stored = JSON.parse(backing.get("metromind-rescue")!);
    const resolved = stored.state.incidents.find((i: { id: string }) => i.id === "inc-seed-1");
    expect(resolved.status).toBe("resolved");
  });
});
