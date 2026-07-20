import { describe, expect, it } from "vitest";
import { processVideoDaily } from "./video";
import type { Video } from "./types";

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

describe("processVideoDaily", () => {
    it("公開当日のバースト・テール・収益・新規ファンを算出する", () => {
        const video = makeVideo();
        const result = processVideoDaily(video, 0, 1000);

        expect(result.views).toBeCloseTo(161.5);
        expect(result.income).toBeCloseTo(80.75);
        expect(result.newFans).toBeCloseTo(8.068276436303082);
        expect(result.video.totalViews).toBeCloseTo(161.5);
        expect(result.video.totalIncome).toBeCloseTo(80.75);
        expect(result.video.archived).toBe(false);
    });

    it("経過日数に応じてバーストが指数減衰する（5日後）", () => {
        const video = makeVideo();
        const result = processVideoDaily(video, 5, 1000);

        expect(result.views).toBeCloseTo(22.995904293079587);
        expect(result.income).toBeCloseTo(11.497952146539793);
        expect(result.newFans).toBeCloseTo(1.1488378497791636);
    });

    it("累計値は既存の累計に加算される", () => {
        const video = makeVideo({ totalViews: 100, totalIncome: 50 });
        const result = processVideoDaily(video, 0, 1000);

        expect(result.video.totalViews).toBeCloseTo(100 + 161.5);
        expect(result.video.totalIncome).toBeCloseTo(50 + 80.75);
    });

    it("公開120日でアーカイブされ、以降は処理対象外になる", () => {
        const video = makeVideo({ totalViews: 999, totalIncome: 999 });
        const result = processVideoDaily(video, 120, 1000);

        expect(result.video.archived).toBe(true);
        expect(result.views).toBe(0);
        expect(result.income).toBe(0);
        expect(result.newFans).toBe(0);
        // アーカイブ後は累計値をそのまま保持する（再計算しない）
        expect(result.video.totalViews).toBe(999);
        expect(result.video.totalIncome).toBe(999);
    });

    it("既にアーカイブ済みの動画は常に0を返す", () => {
        const video = makeVideo({ archived: true, totalViews: 500, totalIncome: 500 });
        const result = processVideoDaily(video, 300, 1000);

        expect(result).toEqual({ video, views: 0, income: 0, newFans: 0 });
    });

    it("公開前（releaseDayより前）は0を返す", () => {
        const video = makeVideo({ releaseDay: 10 });
        const result = processVideoDaily(video, 5, 1000);

        expect(result.views).toBe(0);
        expect(result.video.archived).toBe(false);
    });
});
