import { describe, expect, it } from "vitest";
import { processSongDaily } from "./song";
import type { Song } from "./types";

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

describe("processSongDaily", () => {
    it("発売当日はスパイク＋底流のみ計上される", () => {
        const song = makeSong();
        const result = processSongDaily(song, 0, 1000);

        expect(result.downloads).toBeCloseTo(13.037142857142857);
        expect(result.income).toBeCloseTo(260.74285714285713);
        expect(result.song.totalDownloads).toBeCloseTo(13.037142857142857);
        expect(result.song.totalIncome).toBeCloseTo(260.74285714285713);
    });

    it("ライブブーストは経過日数に応じて減衰しつつ加算される", () => {
        const song = makeSong({ liveBoosts: [{ day: 8, scale: 1 }] });
        const result = processSongDaily(song, 10, 1000);

        expect(result.downloads).toBeCloseTo(8.113472889095327);
        expect(result.income).toBeCloseTo(162.26945778190654);
    });

    it("まだ来ていないライブ予定（当日より未来のboost）は加算しない", () => {
        const song = makeSong({ liveBoosts: [{ day: 20, scale: 1 }] });
        const result = processSongDaily(song, 10, 1000);

        // スパイク＋底流のみ（ライブブーストは0）
        const spikeOnly = 1000 * 0.06 * 1.5 / 7 * Math.exp(-10 / 7);
        const baseline = 1000 * 0.00012 * 1.5 * 1;
        expect(result.downloads).toBeCloseTo(spikeOnly + baseline);
    });

    it("累計値は既存の累計に加算される", () => {
        const song = makeSong({ totalDownloads: 10, totalIncome: 200 });
        const result = processSongDaily(song, 0, 1000);

        expect(result.song.totalDownloads).toBeCloseTo(10 + 13.037142857142857);
        expect(result.song.totalIncome).toBeCloseTo(200 + 260.74285714285713);
    });
});
