import { describe, expect, it } from "vitest";
import { applyFanDecay, requirement, saturation, staminaMax } from "./economy";

describe("saturation", () => {
    it("ファン0では飽和なし（補正1）", () => {
        expect(saturation(0)).toBe(1);
    });

    it("ファン数がsaturationScaleと同じなら補正0.5", () => {
        expect(saturation(1_200_000)).toBeCloseTo(0.5);
    });

    it("ファン数が増えるほど補正は小さくなる（単調減少）", () => {
        expect(saturation(500_000)).toBeGreaterThan(saturation(2_000_000));
    });
});

describe("applyFanDecay", () => {
    it("1日で0.15%減衰する", () => {
        expect(applyFanDecay(1000)).toBeCloseTo(998.5);
    });

    it("ファン0はそのまま0", () => {
        expect(applyFanDecay(0)).toBe(0);
    });
});

describe("requirement", () => {
    it("ファン数=requirementFanBase(50)で要求値20（基準点）", () => {
        expect(requirement(50)).toBeCloseTo(20);
    });

    it("ファン数が10倍で要求値+80（log10なので桁で伸びる）", () => {
        expect(requirement(500)).toBeCloseTo(100);
    });

    it("ファン数が増えるほど要求値は単調増加する", () => {
        expect(requirement(1000)).toBeGreaterThan(requirement(100));
    });

    it("ファン0でも-Infinityにならず有限値を返す（fans=1として扱う）", () => {
        const value = requirement(0);
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeCloseTo(requirement(1));
    });
});

describe("staminaMax", () => {
    it("staminaParam=0で基礎値100", () => {
        expect(staminaMax(0)).toBe(100);
    });

    it("staminaParamが増えるほど上限も増える（0.5倍の緩やかな線形）", () => {
        expect(staminaMax(100)).toBe(150);
        expect(staminaMax(1000)).toBe(600);
    });
});
