// =============================================================
// アルバイト（§6.6） — 序盤の資金源。固定賃金＋おまけステータス、ファンは増えない
// 賃金は現在値に依存せず固定（配信収入のインフレで自然に卒業する設計）
// =============================================================

import { BALANCE } from "./balance";
import { isCritical, isFumble, mentalPenalty, successRate } from "./judge";
import type { ActionResult, Character, Rng, ScoreBand } from "./types";

export type JobId = keyof typeof BALANCE.jobs.list;

export type JobExecution = {
    result: ActionResult;
    staminaDelta: number;
};

/**
 * アルバイトを1回実行する。
 * §6.6は「結果テーブルは賃金×0.8〜1.2の小変動（大成功でボーナス、ファンブルでも減額なし）」とだけ規定しており、
 * §5.1の7点満点スコア帯システムの対象外（ロール構成表が無い）。そのためラック1点の単発判定として扱い、
 * 賃金倍率は標準の scoreCoef テーブルではなくこの関数専用の単純なマッピングで決める。
 * 要求値はレッスンと同様、ラック自身の現在値を使う（常に基準成功率50%＝アルバイトはファン数と無関係に常に安定した選択肢であるべきため）
 */
export function executeJob(jobId: JobId, character: Character, rng: Rng): JobExecution {
    const def = BALANCE.jobs.list[jobId];
    const luck = character.params.luck;
    const die = rng.d100();
    const critical = isCritical(die, luck);
    const fumble = !critical && isFumble(die);
    const rate = successRate(luck, luck, mentalPenalty(character.mental));
    const success = critical || (!fumble && die <= rate);

    const wageMultiplier = critical ? BALANCE.jobs.wageVariance[1] : !fumble && !success ? BALANCE.jobs.wageVariance[0] : 1;
    const money = def.wage * wageMultiplier;

    // 表示用のスコア帯（賃金倍率の計算には使わない。ファンブルでも減額なしのため「事故」は割り当てない）
    const band: ScoreBand = critical ? "great" : !fumble && !success ? "weak" : "standard";

    const result: ActionResult = {
        actionId: jobId,
        rolls: [{ param: "luck", weight: 1, die, effectiveValue: luck, requirement: luck, success, critical, fumble }],
        score: critical ? 2 : success ? 1 : 0,
        band,
        scoreCoef: wageMultiplier,
        effects: {
            money,
            paramGains: { [def.param]: BALANCE.jobs.statGain },
        },
    };

    return { result, staminaDelta: -def.staminaCost };
}
