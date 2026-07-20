// =============================================================
// 動画の日次処理（§8.2） — 公開中動画の再生・収益・新規ファンを計算する
// 公開120日で処理対象から除外（アーカイブ）する
// =============================================================

import { BALANCE } from "./balance";
import { saturation } from "./economy";
import type { Video } from "./types";

export type VideoDailyResult = {
    video: Video;
    views: number;
    income: number;
    newFans: number;
};

/** 動画1本の当日分の再生・収益・新規ファンを計算し、累計を反映した動画を返す */
export function processVideoDaily(video: Video, day: number, currentFans: number): VideoDailyResult {
    if (video.archived) {
        return { video, views: 0, income: 0, newFans: 0 };
    }

    const daysSince = day - video.releaseDay;
    if (daysSince >= BALANCE.video.activeDays) {
        return { video: { ...video, archived: true }, views: 0, income: 0, newFans: 0 };
    }
    if (daysSince < 0) {
        return { video, views: 0, income: 0, newFans: 0 };
    }

    const { burstReach, burstTau, tailRate, tailTau, moneyPerView, fanConversion } = BALANCE.video;
    const burst =
        ((video.fansAtRelease * burstReach * video.thumbnailScore * video.reachMultiplier) / burstTau) *
        Math.exp(-daysSince / burstTau);
    const tail = currentFans * tailRate * video.qualityScore * Math.exp(-daysSince / tailTau);
    const views = burst + tail;
    const income = views * moneyPerView;
    const newFans = views * fanConversion * saturation(currentFans);

    return {
        video: { ...video, totalViews: video.totalViews + views, totalIncome: video.totalIncome + income },
        views,
        income,
        newFans,
    };
}
