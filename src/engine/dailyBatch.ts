// =============================================================
// 日次バッチ処理（§14） — ファン減衰 → 動画再生処理 → 楽曲DL処理 の順で実行する
// トレンド強度は状態を持たないため、必要な箇所で trendIntensity() を都度呼び出す
// =============================================================

import { applyFanDecay } from "./economy";
import { processSongDaily } from "./song";
import { processVideoDaily } from "./video";
import type { Song, Video } from "./types";

export type DailyBatchInput = {
    day: number;
    fans: number;
    money: number;
    videos: Video[];
    songs: Song[];
};

export type DailyBatchResult = {
    fans: number;
    money: number;
    videos: Video[];
    songs: Song[];
    /** ログ・UI表示用の内訳 */
    videoIncome: number;
    songIncome: number;
    videoNewFans: number;
};

export function runDailyBatch(input: DailyBatchInput): DailyBatchResult {
    const fansAfterDecay = applyFanDecay(input.fans);

    let videoIncome = 0;
    let videoNewFans = 0;
    const videos = input.videos.map((video) => {
        const result = processVideoDaily(video, input.day, fansAfterDecay);
        videoIncome += result.income;
        videoNewFans += result.newFans;
        return result.video;
    });

    const fansAfterVideo = fansAfterDecay + videoNewFans;

    let songIncome = 0;
    const songs = input.songs.map((song) => {
        const result = processSongDaily(song, input.day, fansAfterVideo);
        songIncome += result.income;
        return result.song;
    });

    return {
        fans: fansAfterVideo,
        money: input.money + videoIncome + songIncome,
        videos,
        songs,
        videoIncome,
        songIncome,
        videoNewFans,
    };
}
