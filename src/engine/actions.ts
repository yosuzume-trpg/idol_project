// =============================================================
// 配信アクション（§6.1） — ロール構成の定義と実行オーケストレーション
// 現時点で実装済みなのは雑談配信・歌枠配信・休息のみ。
// ゲーム配信（ゲーム購入前提）・企画配信・コラボ配信は前提システム未実装のため後続マイルストーンで追加する
// =============================================================

import { BALANCE } from "./balance";
import { requirement } from "./economy";
import { genreRollSpec } from "./genre";
import { activityParamGains } from "./growth";
import { mentalPenalty, resolveRolls, scoreBand } from "./judge";
import { computeStreamResult } from "./streaming";
import type { ActionDef, ActionResult, Character, Genre, Rng } from "./types";

export const STREAM_ACTIONS: Record<"chatStream" | "songStream", ActionDef> = {
    chatStream: {
        id: "chatStream",
        label: "雑談配信",
        rolls: [
            { param: "talk", weight: 3 },
            { param: "reaction", weight: 2 },
            { param: "charm", weight: 1 },
            { param: "luck", weight: 1 },
        ],
        apCost: 1,
        staminaCost: BALANCE.activityStaminaCost.stream,
        mentalCost: BALANCE.activityMentalCost,
    },
    songStream: {
        id: "songStream",
        label: "歌枠配信",
        rolls: [
            { param: "vocalTechnique", weight: 2 },
            { param: "vocalExpression", weight: 2 },
            { param: "talk", weight: 1 },
            { param: "luck", weight: 1 },
        ],
        genreSlot: true,
        apCost: 1,
        staminaCost: BALANCE.activityStaminaCost.stream,
        mentalCost: BALANCE.activityMentalCost,
    },
};

export type StreamActionId = keyof typeof STREAM_ACTIONS;

export type StreamActionExecution = {
    result: ActionResult;
    /** 負値。呼び出し側でcharacter.staminaに加算する */
    staminaDelta: number;
    /** 負値（事故時は追加ダメージ込み）。呼び出し側でcharacter.mentalに加算する */
    mentalDelta: number;
};

/** 配信アクションを1回実行する（判定→スコア集計→経済効果→成長の一連の流れ） */
export function executeStreamAction(
    actionId: StreamActionId,
    character: Character,
    fans: number,
    genre: Genre | undefined,
    rng: Rng
): StreamActionExecution {
    const def = STREAM_ACTIONS[actionId];
    const specs = def.genreSlot && genre ? [...def.rolls, genreRollSpec(genre)] : def.rolls;
    const req = requirement(fans);
    const penalty = mentalPenalty(character.mental);

    const { outcomes, score } = resolveRolls(specs, character.params, req, character.params.luck, rng, penalty);
    const hasFumble = outcomes.some((outcome) => outcome.fumble);
    const { band, scoreCoef } = scoreBand(score, hasFumble);
    const stream = computeStreamResult(fans, band, scoreCoef);
    const mentalDelta = -def.mentalCost - stream.accidentMentalDamage;

    const result: ActionResult = {
        actionId: def.id,
        rolls: outcomes,
        score,
        band,
        scoreCoef,
        effects: {
            money: stream.money,
            fans: stream.fanDelta,
            paramGains: activityParamGains(outcomes),
            mentalDelta,
        },
    };

    return { result, staminaDelta: -def.staminaCost, mentalDelta };
}

/** 休息（§6.7）。ロールなし。スタミナ最大値の60%回復、メンタル+40（共に上限クランプ） */
export function applyRest(character: Character): Character {
    const stamina = Math.min(
        character.staminaMax,
        character.stamina + character.staminaMax * BALANCE.restStaminaRatio
    );
    const mental = Math.min(BALANCE.mentalMax, character.mental + BALANCE.restMentalRecovery);
    return { ...character, stamina, mental };
}
