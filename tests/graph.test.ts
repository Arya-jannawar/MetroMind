import { describe, expect, it } from "vitest";
import { INTERCHANGE_IDS, LINES, STATIONS, indexOn, lineStationIds, sameLine, segmentOn } from "@/lib/data";

describe("metro graph", () => {
  it("has the verified Phase 1 network shape", () => {
    expect(STATIONS).toHaveLength(29); // 16 aqua + 14 purple − 1 shared
    const aqua = LINES.find((l) => l.id === "aqua")!;
    const purple = LINES.find((l) => l.id === "purple")!;
    expect(aqua.stationIds).toHaveLength(16);
    expect(purple.stationIds).toHaveLength(14);
    expect(aqua.stationIds[0]).toBe("vanaz");
    expect(aqua.stationIds.at(-1)).toBe("ramwadi");
    expect(purple.stationIds[0]).toBe("pcmc-bhavan");
    expect(purple.stationIds.at(-1)).toBe("swargate");
  });

  it("has exactly one interchange shared by both lines", () => {
    expect(INTERCHANGE_IDS).toEqual(["district-court"]);
    for (let i = 0; i < LINES[0].stationIds.length - 1; i++) {
      const a = LINES[0].stationIds[i];
      const b = LINES[0].stationIds[i + 1];
      expect(sameLine(a, b)).toBe("aqua");
    }
    for (let i = 0; i < LINES[1].stationIds.length - 1; i++) {
      const a = LINES[1].stationIds[i];
      const b = LINES[1].stationIds[i + 1];
      expect(sameLine(a, b)).toBe("purple");
    }
  });

  it("returns travel-order segments in both directions", () => {
    expect(segmentOn("aqua", "ramwadi", "vanaz")[0]).toBe("ramwadi");
    expect(segmentOn("aqua", "ramwadi", "vanaz").at(-1)).toBe("vanaz");
    expect(indexOn("aqua", "district-court")).toBe(8);
    expect(lineStationIds("purple").includes("district-court")).toBe(true);
  });
});
