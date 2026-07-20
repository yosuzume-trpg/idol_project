import { describe, expect, it } from "vitest";
import { computeStreamResult } from "./streaming";

describe("computeStreamResult", () => {
    it("標準成功: 同接・資金・ファン増加を算出する", () => {
        const result = computeStreamResult(10000, "standard", 1.0);
        expect(result.concurrentViewers).toBeCloseTo(1000);
        expect(result.money).toBeCloseTo(2000);
        expect(result.fanDelta).toBeCloseTo(43.66942148760331);
        expect(result.accidentMentalDamage).toBe(0);
    });

    it("大成功(great): 資金に1.5倍ボーナスが乗る", () => {
        const result = computeStreamResult(10000, "great", 2.0);
        expect(result.money).toBeCloseTo(6000); // 2000(通常)の1.5倍相当
    });

    it("伝説回(legendary): ファン増加が3倍になる", () => {
        const result = computeStreamResult(10000, "legendary", 3.0);
        expect(result.fanDelta).toBeCloseTo(369.02479338842977);
    });

    it("事故(accident): ファンは既存数の-1%、メンタル追加ダメージが発生する", () => {
        const result = computeStreamResult(10000, "accident", 0.1);
        expect(result.fanDelta).toBeCloseTo(-100);
        expect(result.accidentMentalDamage).toBe(15);
    });

    it("失敗(fail): 小規模ファン数では正味でファンが微減する", () => {
        const result = computeStreamResult(100, "fail", 0.15);
        expect(result.fanDelta).toBeLessThan(0);
        expect(result.fanDelta).toBeCloseTo(-1.4400049995833681);
    });

    it("失敗(fail)でもメンタル追加ダメージはない（事故のみ）", () => {
        const result = computeStreamResult(100, "fail", 0.15);
        expect(result.accidentMentalDamage).toBe(0);
    });
});
