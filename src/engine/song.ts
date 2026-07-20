// =============================================================
// 楽曲の日次処理（§8.3） — 発売スパイク・カタログ底流・ライブブーストからDL/収益を計算する
// =============================================================

import { BALANCE } from "./balance";
import type { Song } from "./types";

export type SongDailyResult = {
    song: Song;
    downloads: number;
    income: number;
};

/** 楽曲1曲の当日分のDL数・収益を計算し、累計を反映した楽曲を返す */
export function processSongDaily(song: Song, day: number, currentFans: number): SongDailyResult {
    const { spikeRatio, spikeTau, baselineRate, liveBoostRatio, liveBoostTau, moneyPerDl } = BALANCE.song;

    const daysSince = day - song.releaseDay;
    const spike =
        daysSince < 0
            ? 0
            : ((song.fansAtRelease * spikeRatio * song.qualityScore) / spikeTau) * Math.exp(-daysSince / spikeTau);

    const baseline = currentFans * baselineRate * song.qualityScore * song.popularity;

    const liveBoost = song.liveBoosts.reduce((sum, boost) => {
        const daysSinceLive = day - boost.day;
        if (daysSinceLive < 0) return sum;
        return sum + currentFans * liveBoostRatio * boost.scale * Math.exp(-daysSinceLive / liveBoostTau);
    }, 0);

    const downloads = spike + baseline + liveBoost;
    const income = downloads * moneyPerDl;

    return {
        song: { ...song, totalDownloads: song.totalDownloads + downloads, totalIncome: song.totalIncome + income },
        downloads,
        income,
    };
}
