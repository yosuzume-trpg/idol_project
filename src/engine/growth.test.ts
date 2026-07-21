import { describe, expect, it } from "vitest";
import { activityParamGains, experienceParamGains, mergeParamGains } from "./growth";
import type { Rng, RollOutcome } from "./types";

function outcome(overrides: Partial<RollOutcome>): RollOutcome {
    return {
        param: "talk",
        weight: 1,
        die: 50,
        effectiveValue: 100,
        requirement: 100,
        success: true,
        critical: false,
        fumble: false,
        ...overrides,
    };
}

/** 指定した乱数列を順に返すテスト用Rng（random()のみ使用） */
function sequenceRandomRng(values: number[]): Rng {
    let i = 0;
    return {
        d100: () => {
            throw new Error("このテストではd100は使用しない");
        },
        random: () => values[i++],
        int: () => {
            throw new Error("このテストではintは使用しない");
        },
    };
}

describe("activityParamGains", () => {
    it("レッスン対応パラメータが成功していれば活動経験値(0.15)が加算される", () => {
        const gains = activityParamGains([outcome({ param: "talk", success: true })]);
        expect(gains.talk).toBeCloseTo(0.15);
    });

    it("失敗したロールは経験値が入らない", () => {
        const gains = activityParamGains([outcome({ param: "talk", success: false })]);
        expect(gains.talk).toBeUndefined();
    });

    it("専用レッスンがないパラメータ（ラック等）は対象外", () => {
        const gains = activityParamGains([outcome({ param: "luck", success: true })]);
        expect(gains.luck).toBeUndefined();
    });

    it("同一パラメータが複数回成功すれば加算される", () => {
        const gains = activityParamGains([
            outcome({ param: "talk", success: true }),
            outcome({ param: "talk", success: true }),
        ]);
        expect(gains.talk).toBeCloseTo(0.3);
    });
});

describe("experienceParamGains", () => {
    it("標準成功以上でrandomが閾値(0.2)未満なら経験系パラメータが成長する", () => {
        const gains = experienceParamGains(
            [outcome({ param: "luck", success: true })],
            true,
            sequenceRandomRng([0.1])
        );
        expect(gains.luck).toBeCloseTo(0.15);
    });

    it("randomが閾値以上なら成長しない", () => {
        const gains = experienceParamGains(
            [outcome({ param: "luck", success: true })],
            true,
            sequenceRandomRng([0.2])
        );
        expect(gains.luck).toBeUndefined();
    });

    it("標準成功未満（isSuccessBand=false）なら乱数を引かず成長しない", () => {
        const gains = experienceParamGains([outcome({ param: "luck", success: true })], false, sequenceRandomRng([]));
        expect(gains.luck).toBeUndefined();
    });

    it("そのロール自身が失敗していても、アクション全体が標準成功以上なら対象になる（専用レッスンが無いパラメータの詰み防止）", () => {
        const gains = experienceParamGains(
            [outcome({ param: "luck", success: false })],
            true,
            sequenceRandomRng([0.1])
        );
        expect(gains.luck).toBeCloseTo(0.15);
    });

    it("ファンブルしたロールは対象外", () => {
        const gains = experienceParamGains(
            [outcome({ param: "luck", success: false, fumble: true })],
            true,
            sequenceRandomRng([0.1])
        );
        expect(gains.luck).toBeUndefined();
    });

    it("専用レッスンがあるパラメータ（トーク等）は対象外", () => {
        const gains = experienceParamGains(
            [outcome({ param: "talk", success: true })],
            true,
            sequenceRandomRng([0.1])
        );
        expect(gains.talk).toBeUndefined();
    });
});

describe("mergeParamGains", () => {
    it("複数の上昇分を合算する", () => {
        const merged = mergeParamGains({ talk: 0.15 }, { talk: 0.15, luck: 0.15 });
        expect(merged.talk).toBeCloseTo(0.3);
        expect(merged.luck).toBeCloseTo(0.15);
    });

    it("空のソースは無視される", () => {
        const merged = mergeParamGains({}, { talk: 0.15 }, {});
        expect(merged.talk).toBeCloseTo(0.15);
        expect(Object.keys(merged)).toEqual(["talk"]);
    });
});
