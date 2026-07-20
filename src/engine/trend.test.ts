import { describe, expect, it } from "vitest";
import { trendIntensity } from "./trend";
import type { Trend } from "./types";

function makeTrend(overrides: Partial<Trend> = {}): Trend {
    return {
        id: "t1",
        title: "テストトレンド",
        kind: "game",
        genre: "rock",
        size: "L",
        startDay: 0,
        ...overrides,
    };
}

describe("trendIntensity", () => {
    it("開始前は0", () => {
        const trend = makeTrend({ startDay: 10 });
        expect(trendIntensity(trend, 5)).toBe(0);
    });

    it("開始直後(t=0)は0（立ち上がり途中）", () => {
        const trend = makeTrend();
        expect(trendIntensity(trend, 0)).toBe(0);
    });

    it("L級: 立ち上がり終了時点(t=rampDays)ではまだ減衰していない", () => {
        const trend = makeTrend({ size: "L" });
        expect(trendIntensity(trend, 4)).toBeCloseTo(0.6321205588285577);
    });

    it("L級: 立ち上がり×2(t=8)でピークに近づく", () => {
        const trend = makeTrend({ size: "L" });
        expect(trendIntensity(trend, 8)).toBeCloseTo(0.8646647167633873);
    });

    it("L級: 半減期に応じて後半は減衰する(t=20)", () => {
        const trend = makeTrend({ size: "L" });
        expect(trendIntensity(trend, 20)).toBeCloseTo(0.6470496956882771);
    });

    it("S級: ピークが低く早く減衰する", () => {
        const trend = makeTrend({ size: "S" });
        expect(trendIntensity(trend, 1.5)).toBeCloseTo(0.22124219558999517);
    });

    it("強度はピーク値を超えない", () => {
        const trend = makeTrend({ size: "L" });
        for (const t of [4, 8, 12, 20, 50, 100]) {
            expect(trendIntensity(trend, t)).toBeLessThanOrEqual(1.0 + 1e-9);
        }
    });
});
