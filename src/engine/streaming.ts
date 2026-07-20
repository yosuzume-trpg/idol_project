// =============================================================
// 配信経済（§8.1） — 同接数・資金・ファン増加をスコア帯から算出する
// =============================================================

import { BALANCE } from "./balance";
import { saturation } from "./economy";
import type { ScoreBand } from "./types";

export type StreamEconomyResult = {
    concurrentViewers: number;
    money: number;
    /** ファン数の増減（accidentは既存ファン数に対する-1%、それ以外は加算値） */
    fanDelta: number;
    /** 事故（小炎上）時の追加メンタルダメージ。それ以外は0 */
    accidentMentalDamage: number;
};

const HIGH_DISCOVERY_BANDS: ReadonlySet<ScoreBand> = new Set(["standard", "good", "great", "legendary"]);

/** 配信1回分の同接・資金・ファン増減を算出する（§5.4の追加効果込み） */
export function computeStreamResult(fans: number, band: ScoreBand, scoreCoef: number): StreamEconomyResult {
    const concurrentViewers = fans * BALANCE.viewerRatio * scoreCoef;
    const moneyMultiplier = band === "great" ? BALANCE.greatMoneyMultiplier : 1;
    const money = concurrentViewers * BALANCE.moneyPerViewer * moneyMultiplier;

    if (band === "accident") {
        // 小炎上: ファン-1%（既存ファン数に対する乗算）＋メンタル追加ダメージ
        return {
            concurrentViewers,
            money,
            fanDelta: fans * (BALANCE.accidentFanRatio - 1),
            accidentMentalDamage: BALANCE.accidentMentalDamage,
        };
    }

    const viewerFans = concurrentViewers * BALANCE.fanInflowRatio * saturation(fans);

    if (band === "fail") {
        // §5.4「失敗: ファン微減」。減少幅は仕様書未確定（§14残課題）のため、
        // 発見ボーナス(低)と同じ大きさを符号反転した値を暫定的な微減量として使う
        return { concurrentViewers, money, fanDelta: viewerFans - BALANCE.discoveryBonusLow, accidentMentalDamage: 0 };
    }

    const discoveryBonus = HIGH_DISCOVERY_BANDS.has(band) ? BALANCE.discoveryBonusHigh : BALANCE.discoveryBonusLow;
    const base = viewerFans + discoveryBonus;
    // 伝説回: ファン増×3（§5.4）
    const fanDelta = band === "legendary" ? base * 3 : base;

    return { concurrentViewers, money, fanDelta, accidentMentalDamage: 0 };
}
