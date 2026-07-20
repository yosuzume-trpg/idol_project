import { describe, expect, it } from "vitest";
import { createRng } from "./rng";

describe("createRng", () => {
    it("同じシードなら同じ数列を返す（リプレイ可能性）", () => {
        const a = createRng(12345);
        const b = createRng(12345);
        const seqA = Array.from({ length: 20 }, () => a.d100());
        const seqB = Array.from({ length: 20 }, () => b.d100());
        expect(seqA).toEqual(seqB);
    });

    it("シードが違えば数列も変わる", () => {
        const a = createRng(1);
        const b = createRng(2);
        const seqA = Array.from({ length: 20 }, () => a.d100());
        const seqB = Array.from({ length: 20 }, () => b.d100());
        expect(seqA).not.toEqual(seqB);
    });

    it("d100は1〜100の整数を返す", () => {
        const rng = createRng(42);
        for (let i = 0; i < 2000; i++) {
            const v = rng.d100();
            expect(Number.isInteger(v)).toBe(true);
            expect(v).toBeGreaterThanOrEqual(1);
            expect(v).toBeLessThanOrEqual(100);
        }
    });

    it("randomは0以上1未満の実数を返す", () => {
        const rng = createRng(7);
        for (let i = 0; i < 2000; i++) {
            const v = rng.random();
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThan(1);
        }
    });

    it("intはmin以上max以下の整数を返す", () => {
        const rng = createRng(99);
        for (let i = 0; i < 2000; i++) {
            const v = rng.int(3, 18); // 3d6相当のレンジ
            expect(Number.isInteger(v)).toBe(true);
            expect(v).toBeGreaterThanOrEqual(3);
            expect(v).toBeLessThanOrEqual(18);
        }
    });
});
