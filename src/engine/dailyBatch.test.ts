import { describe, expect, it } from "vitest";
import { runDailyBatch } from "./dailyBatch";
import type { Song, Video } from "./types";

function makeVideo(overrides: Partial<Video> = {}): Video {
    return {
        id: "v1",
        title: "テスト動画",
        kind: "variety",
        releaseDay: 0,
        fansAtRelease: 1000,
        thumbnailScore: 1,
        qualityScore: 1,
        reachMultiplier: 1,
        totalViews: 0,
        totalIncome: 0,
        archived: false,
        ...overrides,
    };
}

function makeSong(overrides: Partial<Song> = {}): Song {
    return {
        id: "s1",
        title: "テスト楽曲",
        genre: "idol",
        releaseDay: 0,
        fansAtRelease: 1000,
        qualityScore: 1.5,
        popularity: 1,
        totalDownloads: 0,
        totalIncome: 0,
        liveBoosts: [],
        ...overrides,
    };
}

describe("runDailyBatch", () => {
    it("ファン減衰→動画→楽曲の順で処理し、資金・ファン数を合算する", () => {
        const result = runDailyBatch({
            day: 0,
            fans: 1000,
            money: 500,
            videos: [makeVideo()],
            songs: [makeSong()],
        });

        expect(result.videoIncome).toBeCloseTo(80.748875);
        expect(result.videoNewFans).toBeCloseTo(8.068174106795304);
        expect(result.songIncome).toBeCloseTo(260.7665025696416);
        expect(result.money).toBeCloseTo(500 + 80.748875 + 260.7665025696416);
        expect(result.fans).toBeCloseTo(1006.5681741067953);
    });

    it("楽曲の底流は「動画の新規ファン加算後」のファン数を参照する（順序の検証）", () => {
        // 動画なしの場合と比較して、楽曲の底流（ファン数依存）が変わることを確認する
        const withVideo = runDailyBatch({
            day: 0,
            fans: 1000,
            money: 0,
            videos: [makeVideo()],
            songs: [makeSong()],
        });
        const withoutVideo = runDailyBatch({
            day: 0,
            fans: 1000,
            money: 0,
            videos: [],
            songs: [makeSong()],
        });

        expect(withVideo.songIncome).toBeGreaterThan(withoutVideo.songIncome);
    });

    it("動画・楽曲が空でもファン減衰だけは適用される", () => {
        const result = runDailyBatch({ day: 0, fans: 1000, money: 0, videos: [], songs: [] });
        expect(result.fans).toBeCloseTo(998.5);
        expect(result.money).toBe(0);
    });

    it("入力の配列を破壊的に変更しない", () => {
        const videos = [makeVideo()];
        const songs = [makeSong()];
        runDailyBatch({ day: 0, fans: 1000, money: 0, videos, songs });

        expect(videos[0].totalViews).toBe(0);
        expect(songs[0].totalDownloads).toBe(0);
    });
});
