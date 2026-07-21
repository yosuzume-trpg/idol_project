import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { executeJob } from "./jobs";
import type { Character, Params, Rng } from "./types";

/** 指定した出目を順番に返すテスト用Rng（d100のみ使用） */
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

const BASE_PARAMS: Params = {
    vocalTechnique: 10,
    vocalExpression: 10,
    danceTechnique: 10,
    danceExpression: 10,
    editTechnique: 10,
    editComposition: 10,
    lyrics: 10,
    composition: 10,
    talk: 10,
    reaction: 10,
    idea: 10,
    luck: 100,
    staminaParam: 10,
    mentalParam: 10,
    charisma: 10,
    charm: 10,
    negotiation: 10,
    gameSkill: 10,
};

function makeCharacter(overrides: Partial<Character> = {}): Character {
    return { name: "テスト", params: BASE_PARAMS, stamina: 50, staminaMax: 100, mental: 100, ...overrides };
}

describe("executeJob", () => {
    it("クリティカル(die<=7)で賃金×1.2のボーナスが入る", () => {
        const character = makeCharacter();
        const { result, staminaDelta } = executeJob("liveStaff", character, sequenceRng([5]));

        expect(result.rolls[0].critical).toBe(true);
        expect(result.effects.money).toBeCloseTo(BALANCE.jobs.list.liveStaff.wage * BALANCE.jobs.wageVariance[1]);
        expect(staminaDelta).toBe(-BALANCE.jobs.list.liveStaff.staminaCost);
    });

    it("通常成功(die<=50、非クリ)では賃金そのまま", () => {
        const character = makeCharacter();
        const { result } = executeJob("liveStaff", character, sequenceRng([30]));

        expect(result.rolls[0].success).toBe(true);
        expect(result.rolls[0].critical).toBe(false);
        expect(result.effects.money).toBeCloseTo(BALANCE.jobs.list.liveStaff.wage);
    });

    it("通常失敗(die>50、非ファンブル)では賃金×0.8に減額される", () => {
        const character = makeCharacter();
        const { result } = executeJob("liveStaff", character, sequenceRng([70]));

        expect(result.rolls[0].success).toBe(false);
        expect(result.rolls[0].fumble).toBe(false);
        expect(result.effects.money).toBeCloseTo(BALANCE.jobs.list.liveStaff.wage * BALANCE.jobs.wageVariance[0]);
    });

    it("ファンブル(die>=97)でも減額されない（§6.6明記）", () => {
        const character = makeCharacter();
        const { result } = executeJob("liveStaff", character, sequenceRng([99]));

        expect(result.rolls[0].fumble).toBe(true);
        expect(result.effects.money).toBeCloseTo(BALANCE.jobs.list.liveStaff.wage);
    });

    it("対応するステータスにstatGain(0.3)が加算される", () => {
        const character = makeCharacter();
        const { result } = executeJob("cafe", character, sequenceRng([30]));

        expect(result.effects.paramGains?.charm).toBeCloseTo(BALANCE.jobs.statGain);
    });

    it("携帯ショップ店員は交渉にstatGainが加算される（成長手段ゼロだった交渉の追加分）", () => {
        const character = makeCharacter();
        const { result } = executeJob("mobileShop", character, sequenceRng([30]));

        expect(result.effects.paramGains?.negotiation).toBeCloseTo(BALANCE.jobs.statGain);
    });

    it("呼び込みスタッフはカリスマにstatGainが加算される（成長手段が薄かったカリスマの追加分）", () => {
        const character = makeCharacter();
        const { result } = executeJob("barker", character, sequenceRng([30]));

        expect(result.effects.paramGains?.charisma).toBeCloseTo(BALANCE.jobs.statGain);
    });

    it("ファンは変化しない", () => {
        const character = makeCharacter();
        const { result } = executeJob("liveStaff", character, sequenceRng([30]));

        expect(result.effects.fans).toBeUndefined();
    });
});
