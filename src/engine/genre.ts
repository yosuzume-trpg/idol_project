// =============================================================
// 曲ジャンルのロール対訳（§7） — ジャンル差し込み枠がどのパラメータを使うか
// =============================================================

import type { Genre, ParamKey, RollSpec } from "./types";

export const GENRE_ROLL_PARAM: Record<Genre, ParamKey> = {
    idol: "charm",
    rock: "charisma",
    ballad: "mentalParam",
    edm: "danceExpression",
    comedy: "idea",
    rap: "reaction",
};

/** ジャンル差し込み枠（重み1固定、§7） */
export function genreRollSpec(genre: Genre): RollSpec {
    return { param: GENRE_ROLL_PARAM[genre], weight: 1 };
}
