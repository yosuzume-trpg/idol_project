import { describe, expect, it } from "vitest";
import { activityParamGains } from "./growth";
import type { RollOutcome } from "./types";

function outcome(overrides: Partial<RollOutcome>): RollOutcome {
    return { param: "talk", weight: 1, die: 50, success: true, critical: false, fumble: false, ...overrides };
}

describe("activityParamGains", () => {
    it("レッスン対応パラメータが成功していれば活動経験値(0.15)が加算される", () => {
        const gains = activityParamGains([outcome({ param: "talk", success: true })]);
        expect(gains.talk).toBeCloseTo(0.15);
    });

    it("失敗したロールは経験値が入らない", () => {
        const gains = activityParamGains([outcome({ param: "talk", success: false })]);
        expect(gains.talk).toBeUndefined();
    });

    it("専用レッスンがないパラメータ（ラック等）は対象外", () => {
        const gains = activityParamGains([outcome({ param: "luck", success: true })]);
        expect(gains.luck).toBeUndefined();
    });

    it("同一パラメータが複数回成功すれば加算される", () => {
        const gains = activityParamGains([
            outcome({ param: "talk", success: true }),
            outcome({ param: "talk", success: true }),
        ]);
        expect(gains.talk).toBeCloseTo(0.3);
    });
});
