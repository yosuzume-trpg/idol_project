import { describe, expect, it } from "vitest";
import { applyRest, executeStreamAction, STREAM_ACTIONS } from "./actions";
import { BALANCE } from "./balance";
import type { Character, Equipment, Params, Rng } from "./types";

const ZERO_EQUIPMENT: Equipment = {
    mic: { level: 0 },
    camera: { level: 0 },
    pc: { level: 0 },
    outfit: { level: 0 },
    practiceEnv: { level: 0 },
};

/**
 * 指定した出目を順番に返すテスト用Rng。
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

describe("STREAM_ACTIONS", () => {
    it("雑談配信のロール合計重みは7", () => {
        const total = STREAM_ACTIONS.chatStream.rolls.reduce((sum, r) => sum + r.weight, 0);
        expect(total).toBe(7);
    });

    it("歌枠配信はジャンル枠込みで合計重み7", () => {
        const total = STREAM_ACTIONS.songStream.rolls.reduce((sum, r) => sum + r.weight, 0);
        expect(total + 1).toBe(7); // +1はジャンル差し込み枠
    });
});

describe("executeStreamAction", () => {
    it("全ロール成功（クリ・ファンブルなし）でスコア7=大成功となり、経済効果と活動経験値が計算される", () => {
        const character = makeCharacter();
        // fans=50 → requirement=20、実効値100なら成功率は95%クランプでほぼ確実に成功する出目を選ぶ
        const rng = sequenceRng([50, 50, 50, 50]);
        const { result, staminaDelta, mentalDelta } = executeStreamAction("chatStream", character, 50, ZERO_EQUIPMENT, undefined, rng);

        expect(result.score).toBe(7);
        expect(result.band).toBe("great");
        expect(result.effects.money).toBeCloseTo(30);
        expect(result.effects.fans).toBeCloseTo(4.399983334027749);
        // talk/reactionはレッスン対応パラメータなので活動経験値が確定で入る。
        // charm/luckは経験系パラメータで確率成長(20%)の対象だが、randomのデフォルト値(1)では発生しない
        expect(result.effects.paramGains?.talk).toBeCloseTo(BALANCE.activityGain);
        expect(result.effects.paramGains?.reaction).toBeCloseTo(BALANCE.activityGain);
        expect(result.effects.paramGains?.charm).toBeUndefined();
        expect(result.effects.paramGains?.luck).toBeUndefined();

        expect(staminaDelta).toBe(-BALANCE.activityStaminaCost.stream);
        expect(mentalDelta).toBe(-BALANCE.activityMentalCost);
    });

    it("標準成功以上でrandomが閾値(0.2)未満なら経験系パラメータ（charm/luck）が確率成長する", () => {
        const character = makeCharacter();
        const rng = sequenceRng([50, 50, 50, 50], [0.1, 0.1]); // charm→0.1(成長), luck→0.1(成長)
        const { result } = executeStreamAction("chatStream", character, 50, ZERO_EQUIPMENT, undefined, rng);

        expect(result.effects.paramGains?.charm).toBeCloseTo(BALANCE.activityGain);
        expect(result.effects.paramGains?.luck).toBeCloseTo(BALANCE.activityGain);
    });

    it("メンタルが30%未満だと全ロールにペナルティ-10が掛かり成功しにくくなる", () => {
        // talkの実効値をrequirement(fans=50)=20と揃え、通常の成功率をちょうど50%にする
        const params = { ...BASE_PARAMS, talk: 20 };
        const character = makeCharacter({ mental: 10, params }); // 10 < mentalMax(100)×30% → ペナルティ対象
        // talkの出目45: ペナルティなしなら成功(50%)、ペナルティ-10で失敗(40%)に転じる
        // 他3ロール(reaction/charm/luck)は実効値100と十分高いのでペナルティ後も出目50で成功する
        const rng = sequenceRng([45, 50, 50, 50]);

        const { result } = executeStreamAction("chatStream", character, 50, ZERO_EQUIPMENT, undefined, rng);

        expect(result.rolls[0].param).toBe("talk");
        expect(result.rolls[0].success).toBe(false);
        expect(result.rolls.slice(1).every((r) => r.success)).toBe(true);
    });

    it("歌枠配信はジャンル指定でジャンル対応パラメータのロールが追加される", () => {
        const character = makeCharacter();
        const rng = sequenceRng([50, 50, 50, 50, 50]);
        const { result } = executeStreamAction("songStream", character, 50, ZERO_EQUIPMENT, "rock", rng);

        expect(result.rolls).toHaveLength(5);
        expect(result.rolls.at(-1)?.param).toBe("charisma");
    });

    it("ジャンル未指定なら歌枠配信のジャンル枠は追加されない", () => {
        const character = makeCharacter();
        const rng = sequenceRng([50, 50, 50, 50]);
        const { result } = executeStreamAction("songStream", character, 50, ZERO_EQUIPMENT, undefined, rng);

        expect(result.rolls).toHaveLength(4);
    });

    it("マイク補正（§12.3）は配信系全ロールの実効値に一律加算される", () => {
        const params = { ...BASE_PARAMS, talk: 10, reaction: 10, charm: 10, luck: 10 };
        const character = makeCharacter({ params });
        // fans=50→requirement=20。実効値10のままだと成功率40%（die=55は失敗）
        const equipment: Equipment = { ...ZERO_EQUIPMENT, mic: { level: 10 } };
        // マイク補正=10×3=30 → 実効値40、成功率70%（die=55は成功）
        const rng = sequenceRng([55, 55, 55, 55]);

        const { result } = executeStreamAction("chatStream", character, 50, equipment, undefined, rng);

        expect(result.rolls.every((r) => r.effectiveValue === 40)).toBe(true);
        expect(result.rolls.every((r) => r.success)).toBe(true);
    });
});

describe("applyRest", () => {
    it("スタミナは最大値の60%回復し、上限を超えない", () => {
        // staminaMax=200なら回復量120。上限に余裕がある場合はクランプされない
        const character = makeCharacter({ stamina: 50, staminaMax: 200 });
        expect(applyRest(character).stamina).toBeCloseTo(170); // 50+200*0.6=170

        const nearFull = makeCharacter({ stamina: 150, staminaMax: 200 });
        expect(applyRest(nearFull).stamina).toBe(200); // 150+120=270 → 上限200にクランプ
    });

    it("メンタルは+40され、上限100を超えない", () => {
        const character = makeCharacter({ mental: 70 });
        expect(applyRest(character).mental).toBe(100); // 70+40=110 → 上限100にクランプ

        const lowMental = makeCharacter({ mental: 10 });
        expect(applyRest(lowMental).mental).toBe(50);
    });
});
