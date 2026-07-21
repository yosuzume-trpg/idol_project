import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { executeLesson, lessonCost, lessonGainAmount, lessonTarget, LESSONS } from "./lessons";
import type { Character, Equipment, Params, Rng } from "./types";

const ZERO_EQUIPMENT: Equipment = {
    mic: { level: 0 },
    camera: { level: 0 },
    pc: { level: 0 },
    outfit: { level: 0 },
    practiceEnv: { level: 0 },
};

/**
 * 指定した出目・乱数列を順に返すテスト用Rng。
 * randomsを省略した場合は常に1を返す（経験系パラメータの確率成長(閾値0.2)を発生させない）
 */
function sequenceRng(dice: number[], randoms: number[] = []): Rng {
    let i = 0;
    let r = 0;
    return {
        d100: () => {
            if (i >= dice.length) throw new Error("d100が想定回数を超えて呼ばれた");
            return dice[i++];
        },
        random: () => (r < randoms.length ? randoms[r++] : 1),
        int: () => {
            throw new Error("このテストではintは使用しない");
        },
    };
}

const BASE_PARAMS: Params = {
    vocalTechnique: 100,
    vocalExpression: 100,
    danceTechnique: 100,
    danceExpression: 100,
    editTechnique: 100,
    editComposition: 100,
    lyrics: 100,
    composition: 100,
    talk: 100,
    reaction: 100,
    idea: 100,
    luck: 100,
    staminaParam: 100,
    mentalParam: 100,
    charisma: 100,
    charm: 100,
    negotiation: 100,
    gameSkill: 100,
};

function makeCharacter(overrides: Partial<Character> = {}): Character {
    return { name: "テスト", params: BASE_PARAMS, stamina: 50, staminaMax: 100, mental: 100, ...overrides };
}

describe("LESSONS", () => {
    it.each(Object.values(LESSONS))("$label のロール合計重みは7", (def) => {
        const total = def.targetWeight + def.supportRolls.reduce((sum, r) => sum + r.weight, 0);
        expect(total).toBe(7);
    });
});

describe("lessonTarget", () => {
    it("選択式レッスンは指定したパラメータを返す", () => {
        expect(lessonTarget(LESSONS.vocalLesson, "vocalExpression")).toBe("vocalExpression");
    });

    it("選択式レッスンで未指定だとエラーになる", () => {
        expect(() => lessonTarget(LESSONS.vocalLesson, undefined)).toThrow();
    });

    it("固定式レッスンは指定不要でfixedTargetを返す", () => {
        expect(lessonTarget(LESSONS.gym, undefined)).toBe("staminaParam");
    });
});

describe("lessonCost", () => {
    it("対象パラメータの現在値×1.5Gになる", () => {
        expect(lessonCost(BASE_PARAMS, "vocalTechnique")).toBeCloseTo(150);
    });
});

describe("lessonGainAmount", () => {
    it("伝説回はlessonGainSuccessの2倍", () => {
        expect(lessonGainAmount("legendary")).toBeCloseTo(BALANCE.lessonGainSuccess * BALANCE.lessonCritMultiplier);
    });

    it("大成功/好調/標準成功はlessonGainSuccess", () => {
        expect(lessonGainAmount("great")).toBeCloseTo(BALANCE.lessonGainSuccess);
        expect(lessonGainAmount("good")).toBeCloseTo(BALANCE.lessonGainSuccess);
        expect(lessonGainAmount("standard")).toBeCloseTo(BALANCE.lessonGainSuccess);
    });

    it("不発/失敗/事故は最低保証lessonGainFail", () => {
        expect(lessonGainAmount("weak")).toBeCloseTo(BALANCE.lessonGainFail);
        expect(lessonGainAmount("fail")).toBeCloseTo(BALANCE.lessonGainFail);
        expect(lessonGainAmount("accident")).toBeCloseTo(BALANCE.lessonGainFail);
    });
});

describe("executeLesson", () => {
    it("全ロール成功（スコア7=大成功）で対象パラメータが+2.2、支援ロールのスタミナに活動経験値が入る", () => {
        const character = makeCharacter();
        // レッスンの要求値は各ロール自身の現在値(100)-成功寄りボーナス(10)=90。基準成功率60%（die<=60で成功）
        const rng = sequenceRng([50, 50, 50, 50]);
        const { result, targetParam, cost, staminaDelta, mentalDelta } = executeLesson(
            "vocalLesson",
            "vocalTechnique",
            character,
            ZERO_EQUIPMENT,
            rng
        );

        expect(targetParam).toBe("vocalTechnique");
        expect(cost).toBeCloseTo(150); // 実行前のvocalTechnique(100)×1.5
        expect(result.score).toBe(7);
        expect(result.band).toBe("great");
        expect(result.effects.paramGains?.vocalTechnique).toBeCloseTo(BALANCE.lessonGainSuccess);
        // staminaParamは支援ロール（対象外）として活動経験値(0.15)の対象になる
        expect(result.effects.paramGains?.staminaParam).toBeCloseTo(BALANCE.activityGain);
        // mentalParamは経験系パラメータ。randomのデフォルト(1)では確率成長は発生しない
        expect(result.effects.paramGains?.mentalParam).toBeUndefined();

        expect(staminaDelta).toBe(-BALANCE.activityStaminaCost.lesson);
        expect(mentalDelta).toBe(-BALANCE.activityMentalCost);
    });

    it("全ロール失敗（スコア0）でも最低保証+0.7が対象パラメータに入る", () => {
        const character = makeCharacter();
        // 要求値=実効値(100)-10=90 → 基準成功率60%。出目96(>60、フォンブル閾値97未満)で通常失敗にする
        const rng = sequenceRng([96, 96, 96, 96]);
        const { result } = executeLesson("vocalLesson", "vocalTechnique", character, ZERO_EQUIPMENT, rng);

        expect(result.score).toBe(0);
        expect(result.band).toBe("fail");
        expect(result.effects.paramGains?.vocalTechnique).toBeCloseTo(BALANCE.lessonGainFail);
    });

    it("支援ロールは対象パラメータではなく自分自身の値を要求値にする（特化した対象パラメータに引きずられて要求値割れしない）", () => {
        // 対象(vocalTechnique)だけ突出して高く(100)、支援ロール(staminaParam等)は低いまま(10)のケース。
        // もし支援ロールの要求値が対象パラメータの値(100)を共有していたら、10−100で成功率は5%floorに張り付くはず。
        // 各ロールが自分自身の値を要求値にしていれば、支援ロールも基準60%（成功寄りボーナス込み）を維持できる
        const params = { ...BASE_PARAMS, vocalTechnique: 100, staminaParam: 10, mentalParam: 10, luck: 10 };
        const character = makeCharacter({ params });
        const rng = sequenceRng([50, 55, 55, 55]);

        const { result } = executeLesson("vocalLesson", "vocalTechnique", character, ZERO_EQUIPMENT, rng);

        expect(result.rolls[1].param).toBe("staminaParam");
        expect(result.rolls[1].success).toBe(true);
        expect(result.rolls[2].param).toBe("mentalParam");
        expect(result.rolls[2].success).toBe(true);
    });

    it("固定式レッスン（ジム）はtarget未指定でもstaminaParamを鍛える", () => {
        const character = makeCharacter();
        const rng = sequenceRng([50, 50, 50]);
        const { result, targetParam } = executeLesson("gym", undefined, character, ZERO_EQUIPMENT, rng);

        expect(targetParam).toBe("staminaParam");
        expect(result.effects.paramGains?.staminaParam).toBeCloseTo(BALANCE.lessonGainSuccess);
    });

    it("事故（ファンブル込みでスコア3未満）はメンタルに追加ダメージが入る", () => {
        const character = makeCharacter();
        // 1本目(対象:vocalTechnique)をファンブル(出目99)、残り3本を通常失敗(96)にしてスコア-2、事故判定にする
        const rng = sequenceRng([99, 96, 96, 96]);
        const { result, mentalDelta } = executeLesson("vocalLesson", "vocalTechnique", character, ZERO_EQUIPMENT, rng);

        expect(result.band).toBe("accident");
        expect(mentalDelta).toBe(-BALANCE.activityMentalCost - BALANCE.accidentMentalDamage);
    });

    it("練習環境（§12.1）はレッスンの成長量そのものを%ブーストする", () => {
        const character = makeCharacter();
        const equipment: Equipment = { ...ZERO_EQUIPMENT, practiceEnv: { level: 10 } }; // 倍率1+10×0.02=1.2
        const rng = sequenceRng([50, 50, 50, 50]);

        const { result } = executeLesson("vocalLesson", "vocalTechnique", character, equipment, rng);

        expect(result.effects.paramGains?.vocalTechnique).toBeCloseTo(BALANCE.lessonGainSuccess * 1.2);
    });
});
