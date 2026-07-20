import { describe, expect, it } from "vitest";
import {
    criticalThreshold,
    isCritical,
    isFumble,
    mentalPenalty,
    resolveRoll,
    resolveRolls,
    scoreBand,
    successRate,
} from "./judge";
import type { Rng, RollSpec } from "./types";

/** 指定した出目を順番に返すテスト用Rng（random/intは未使用のため呼ばれたらエラーにする） */
function sequenceRng(dice: number[]): Rng {
    let i = 0;
    return {
        d100: () => {
            if (i >= dice.length) throw new Error("d100が想定回数を超えて呼ばれた");
            return dice[i++];
        },
        random: () => {
            throw new Error("このテストではrandomは使用しない");
        },
        int: () => {
            throw new Error("このテストではintは使用しない");
        },
    };
}

describe("successRate", () => {
    it("実効値=要求値のとき50%", () => {
        expect(successRate(100, 100)).toBe(50);
    });

    it("要求値100未満は差1=1%の線形", () => {
        // 分母は max(requirement, 100) = 100 固定なので、要求値20・実効値30なら差10→+10%
        expect(successRate(30, 20)).toBe(60);
    });

    it("要求値100以上は比率ベース", () => {
        // 差200、分母1000 → +20%
        expect(successRate(1200, 1000)).toBe(70);
    });

    it("5%未満にはならない（下限クランプ）", () => {
        expect(successRate(0, 100000)).toBe(5);
    });

    it("95%を超えない（上限クランプ）", () => {
        expect(successRate(100000, 100)).toBe(95);
    });

    it("penaltyは成功率に加算される（メンタル低下修正など）", () => {
        expect(successRate(100, 100, -10)).toBe(40);
    });
});

describe("mentalPenalty", () => {
    it("メンタルが30%以上ならペナルティなし", () => {
        expect(mentalPenalty(30)).toBe(0);
        expect(mentalPenalty(100)).toBe(0);
    });

    it("メンタルが30%未満なら-10", () => {
        expect(mentalPenalty(29)).toBe(-10);
        expect(mentalPenalty(0)).toBe(-10);
    });
});

describe("criticalThreshold / isCritical / isFumble", () => {
    it("ラック0なら閾値は5（01〜05）", () => {
        expect(criticalThreshold(0)).toBe(5);
    });

    it("ラックが高いほど閾値が伸びるが+10で頭打ち", () => {
        expect(criticalThreshold(250)).toBe(10); // 5 + min(10, 250/50=5) = 10
        expect(criticalThreshold(1000)).toBe(15); // 5 + min(10, 20) = 15
    });

    it("出目が閾値以下ならクリティカル", () => {
        expect(isCritical(5, 0)).toBe(true);
        expect(isCritical(6, 0)).toBe(false);
    });

    it("出目97以上はファンブル", () => {
        expect(isFumble(96)).toBe(false);
        expect(isFumble(97)).toBe(true);
        expect(isFumble(100)).toBe(true);
    });
});

describe("resolveRoll", () => {
    const spec: RollSpec = { param: "talk", weight: 3 };

    it("クリティカルは自動成功として扱う（要求値が極端でも）", () => {
        const rng = sequenceRng([3]);
        const outcome = resolveRoll(spec, 0, 999999, 0, rng);
        expect(outcome.critical).toBe(true);
        expect(outcome.fumble).toBe(false);
        expect(outcome.success).toBe(true);
    });

    it("ファンブルは自動失敗として扱う（成功率が極端に高くても）", () => {
        const rng = sequenceRng([99]);
        const outcome = resolveRoll(spec, 999999, 1, 0, rng);
        expect(outcome.fumble).toBe(true);
        expect(outcome.critical).toBe(false);
        expect(outcome.success).toBe(false);
    });

    it("通常域は成功率どおりに成否が決まる", () => {
        // 実効値=要求値 → 成功率50%。出目50は成功、51は失敗
        const rngSuccess = sequenceRng([50]);
        expect(resolveRoll(spec, 100, 100, 0, rngSuccess).success).toBe(true);

        const rngFail = sequenceRng([51]);
        expect(resolveRoll(spec, 100, 100, 0, rngFail).success).toBe(false);
    });

    it("penaltyが成功率に反映される", () => {
        // 実効値=要求値・penalty-10 → 成功率40%。出目40は成功、41は失敗
        const rngSuccess = sequenceRng([40]);
        expect(resolveRoll(spec, 100, 100, 0, rngSuccess, -10).success).toBe(true);

        const rngFail = sequenceRng([41]);
        expect(resolveRoll(spec, 100, 100, 0, rngFail, -10).success).toBe(false);
    });
});

describe("resolveRolls / scoreBand", () => {
    it("期待スコア: 成功率50%×重み1.75の4本なら合計3.5相当になる出目で検証", () => {
        // 4本とも通常成功（クリ・ファンブルなし）、重み1.75×4=7点満点中、2本成功2本失敗で3.5点
        const specs: RollSpec[] = [
            { param: "talk", weight: 1.75 },
            { param: "reaction", weight: 1.75 },
            { param: "charm", weight: 1.75 },
            { param: "luck", weight: 1.75 },
        ];
        // 成功率50%（実効値=要求値）。出目10,20(成功) / 60,70(失敗)、いずれもクリ・ファンブル域外
        const rng = sequenceRng([10, 20, 60, 70]);
        const values = { talk: 100, reaction: 100, charm: 100, luck: 100 };
        const { outcomes, score } = resolveRolls(specs, values, 100, 0, rng);
        expect(outcomes.every((o) => !o.critical && !o.fumble)).toBe(true);
        expect(score).toBeCloseTo(3.5);
    });

    it("クリティカルは重み2倍で加算される", () => {
        const specs: RollSpec[] = [{ param: "talk", weight: 3 }];
        const rng = sequenceRng([1]); // クリティカル
        const { score } = resolveRolls(specs, { talk: 0 }, 100, 0, rng);
        expect(score).toBe(6);
    });

    it("ファンブルは重み分マイナスで加算される", () => {
        const specs: RollSpec[] = [{ param: "talk", weight: 3 }];
        const rng = sequenceRng([100]); // ファンブル
        const { score } = resolveRolls(specs, { talk: 999999 }, 1, 0, rng);
        expect(score).toBe(-3);
    });

    it("scoreBand: 8以上は伝説回", () => {
        expect(scoreBand(8, false)).toEqual({ band: "legendary", scoreCoef: 3.0 });
    });

    it("scoreBand: 3〜4は標準成功（重心）", () => {
        expect(scoreBand(3, false)).toEqual({ band: "standard", scoreCoef: 1.0 });
        expect(scoreBand(4, false)).toEqual({ band: "standard", scoreCoef: 1.0 });
    });

    it("scoreBand: 0以下は失敗", () => {
        expect(scoreBand(0, false)).toEqual({ band: "fail", scoreCoef: 0.15 });
    });

    it("scoreBand: ファンブルを含みスコア3未満なら事故", () => {
        expect(scoreBand(2, true)).toEqual({ band: "accident", scoreCoef: 0.1 });
        expect(scoreBand(-5, true)).toEqual({ band: "accident", scoreCoef: 0.1 });
    });

    it("scoreBand: ファンブルがあってもスコア3以上なら事故にならない", () => {
        expect(scoreBand(3, true)).toEqual({ band: "standard", scoreCoef: 1.0 });
    });
});
