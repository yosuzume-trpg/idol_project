import { describe, expect, it } from "vitest";
import { GENRE_ROLL_PARAM, genreRollSpec } from "./genre";

describe("GENRE_ROLL_PARAM", () => {
    it("§7の対応表どおりに全ジャンルが定義されている", () => {
        expect(GENRE_ROLL_PARAM).toEqual({
            idol: "charm",
            rock: "charisma",
            ballad: "mentalParam",
            edm: "danceExpression",
            comedy: "idea",
            rap: "reaction",
        });
    });
});

describe("genreRollSpec", () => {
    it("重み1固定でジャンル対応パラメータのロール仕様を返す", () => {
        expect(genreRollSpec("rock")).toEqual({ param: "charisma", weight: 1 });
    });
});
