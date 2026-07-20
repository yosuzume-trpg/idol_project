// =============================================================
// トレンド強度（§9.1） — 発生からの経過日数に応じた強度を算出する
// トレンドの新規発生・タイトル生成・SNSチェックはマイルストーン7で扱う
// =============================================================

import { BALANCE } from "./balance";
import type { Trend } from "./types";

/** 指定日におけるトレンド強度を算出する。開始前は0 */
export function trendIntensity(trend: Trend, day: number): number {
    const t = day - trend.startDay;
    if (t < 0) return 0;

    const { peak, rampDays, halfLife } = BALANCE.trend.sizes[trend.size];
    const rampFactor = 1 - Math.exp(-t / rampDays);
    const decayFactor = Math.exp(-Math.max(0, t - rampDays * 2) / halfLife);
    return peak * rampFactor * decayFactor;
}
