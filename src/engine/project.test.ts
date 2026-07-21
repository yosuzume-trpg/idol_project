import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { advanceProject, SONG_STAGE_IDS, startSongProject, startVideoProject, VIDEO_STAGE_IDS } from "./project";
import type { Character, Equipment, Params, Rng } from "./types";

const ZERO_EQUIPMENT: Equipment = {
    mic: { level: 0 },
    camera: { level: 0 },
    pc: { level: 0 },
    outfit: { level: 0 },
    practiceEnv: { level: 0 },
};

/**
 * 指定した出目を順番に返すテスト用Rng。
 * randomは常に1を返す（経験系パラメータの確率成長(閾値0.2)を発生させない）
 */
function sequenceRng(dice: number[]): Rng {
    let i = 0;
    return {
        d100: () => {
            if (i >= dice.length) throw new Error("d100が想定回数を超えて呼ばれた");
            return dice[i++];
        },
        random: () => 1,
        int: () => {
            throw new Error("このテストではintは使用しない");
        },
    };
}

const BASE_PARAMS: Params = {
    vocalTechnique: 100,
    vocalExpression: 100,
    danceTechnique: 100,
    danceExpression: 100,
    editTechnique: 100,
    editComposition: 100,
    lyrics: 100,
    composition: 100,
    talk: 100,
    reaction: 100,
    idea: 100,
    luck: 100,
    staminaParam: 100,
    mentalParam: 100,
    charisma: 100,
    charm: 100,
    negotiation: 100,
    gameSkill: 100,
};

function makeCharacter(overrides: Partial<Character> = {}): Character {
    return { name: "テスト", params: BASE_PARAMS, stamina: 50, staminaMax: 100, mental: 100, ...overrides };
}

describe("startVideoProject / startSongProject", () => {
    it("動画プロジェクトは指定した種別・ジャンルで工程0から開始する", () => {
        const project = startVideoProject("song", "rock");
        expect(project).toEqual({ kind: "video", videoKind: "song", genre: "rock", stageScores: [], currentStage: 0 });
    });

    it("楽曲プロジェクトはジャンル必須で工程0から開始する", () => {
        const project = startSongProject("idol");
        expect(project).toEqual({ kind: "song", genre: "idol", stageScores: [], currentStage: 0 });
    });
});

describe("advanceProject（動画）", () => {
    it("撮影→編集→サムネ/公開の3工程を経て動画が完成する（歌動画・ジャンルなし）", () => {
        const character = makeCharacter();
        let project = startVideoProject("song");

        // 撮影: ボーカル技術2/表現2/スタミナ2/ラック1
        const shoot = advanceProject(project, character, 50, ZERO_EQUIPMENT, 10, undefined, sequenceRng([50, 50, 50, 50]));
        expect(shoot.result.actionId).toBe(VIDEO_STAGE_IDS[0]);
        expect(shoot.result.score).toBe(7);
        expect(shoot.completedVideo).toBeUndefined();
        expect(shoot.staminaDelta).toBe(-BALANCE.activityStaminaCost.production);
        expect(shoot.mentalDelta).toBe(-BALANCE.activityMentalCost);
        project = shoot.project;
        expect(project.currentStage).toBe(1);

        // 編集: 編集技術3/編集構成3/スタミナ1
        const edit = advanceProject(project, character, 50, ZERO_EQUIPMENT, 10, undefined, sequenceRng([50, 50, 50]));
        expect(edit.result.actionId).toBe(VIDEO_STAGE_IDS[1]);
        expect(edit.completedVideo).toBeUndefined();
        project = edit.project;
        expect(project.currentStage).toBe(2);

        // サムネ/公開: 編集構成2/アイデア2/カリスマ1/ラック2
        const publish = advanceProject(project, character, 50, ZERO_EQUIPMENT, 10, undefined, sequenceRng([50, 50, 50, 50]));
        expect(publish.result.actionId).toBe(VIDEO_STAGE_IDS[2]);
        expect(publish.completedVideo).toBeDefined();

        const video = publish.completedVideo!;
        expect(video.kind).toBe("song");
        expect(video.releaseDay).toBe(10);
        expect(video.fansAtRelease).toBe(50);
        // 全工程スコア7（満点）→ base0.8+7×(1.5/7)=2.3（§8.2の上限値と一致）
        expect(video.qualityScore).toBeCloseTo(2.3);
        expect(video.thumbnailScore).toBeCloseTo(2.3);
        // 直前動画なし（previousVideoDay未指定）→ 疲労なしでreachMultiplier=1
        expect(video.reachMultiplier).toBeCloseTo(1);
        expect(video.archived).toBe(false);
    });

    it("歌動画・ジャンル指定時はラック1点がジャンル対応パラメータに置き換わる（合計7点維持）", () => {
        const character = makeCharacter();
        const project = startVideoProject("song", "rock"); // rock→charisma
        const { result } = advanceProject(project, character, 50, ZERO_EQUIPMENT, 0, undefined, sequenceRng([50, 50, 50, 50]));

        const totalWeight = result.rolls.reduce((sum, r) => sum + r.weight, 0);
        expect(totalWeight).toBe(7);
        expect(result.rolls.some((r) => r.param === "luck")).toBe(false);
        expect(result.rolls.some((r) => r.param === "charisma")).toBe(true);
    });

    it("企画（variety）動画の撮影はジャンル差し込みなし", () => {
        const character = makeCharacter();
        const project = startVideoProject("variety");
        const { result } = advanceProject(project, character, 50, ZERO_EQUIPMENT, 0, undefined, sequenceRng([50, 50, 50, 50]));

        expect(result.rolls.map((r) => r.param)).toEqual(["idea", "talk", "staminaParam", "luck"]);
        const totalWeight = result.rolls.reduce((sum, r) => sum + r.weight, 0);
        expect(totalWeight).toBe(7);
    });

    it("直前動画からの経過日数が短いとreachMultiplierが小さくなる（視聴者疲労）", () => {
        const character = makeCharacter();
        let project = startVideoProject("song");
        project = advanceProject(project, character, 50, ZERO_EQUIPMENT, 20, 15, sequenceRng([50, 50, 50, 50])).project;
        project = advanceProject(project, character, 50, ZERO_EQUIPMENT, 20, 15, sequenceRng([50, 50, 50])).project;
        const publish = advanceProject(project, character, 50, ZERO_EQUIPMENT, 20, 15, sequenceRng([50, 50, 50, 50]));

        // gap=5日 → 1-exp(-5/5) = 1-exp(-1) ≈ 0.6321
        expect(publish.completedVideo!.reachMultiplier).toBeCloseTo(1 - Math.exp(-1), 4);
    });

    it("カメラ補正は撮影・サムネ/公開工程の実効値に加算され、編集工程には適用されない", () => {
        const character = makeCharacter();
        const equipment: Equipment = { ...ZERO_EQUIPMENT, camera: { level: 5 } }; // 補正+15
        let project = startVideoProject("song");

        const shoot = advanceProject(project, character, 50, equipment, 0, undefined, sequenceRng([50, 50, 50, 50]));
        expect(shoot.result.rolls.every((r) => r.effectiveValue === 115)).toBe(true);
        project = shoot.project;

        const edit = advanceProject(project, character, 50, equipment, 0, undefined, sequenceRng([50, 50, 50]));
        expect(edit.result.rolls.every((r) => r.effectiveValue === 100)).toBe(true);
    });

    it("PC補正は編集工程の実効値に加算され、撮影工程には適用されない", () => {
        const character = makeCharacter();
        const equipment: Equipment = { ...ZERO_EQUIPMENT, pc: { level: 5 } }; // 補正+15
        let project = startVideoProject("song");

        const shoot = advanceProject(project, character, 50, equipment, 0, undefined, sequenceRng([50, 50, 50, 50]));
        expect(shoot.result.rolls.every((r) => r.effectiveValue === 100)).toBe(true);
        project = shoot.project;

        const edit = advanceProject(project, character, 50, equipment, 0, undefined, sequenceRng([50, 50, 50]));
        expect(edit.result.rolls.every((r) => r.effectiveValue === 115)).toBe(true);
    });
});

describe("advanceProject（楽曲）", () => {
    it("作詞→作曲→レコーディングの3工程を経て楽曲が完成する", () => {
        const character = makeCharacter();
        let project = startSongProject("idol");

        const lyrics = advanceProject(project, character, 50, ZERO_EQUIPMENT, 5, undefined, sequenceRng([50, 50, 50]));
        expect(lyrics.result.actionId).toBe(SONG_STAGE_IDS[0]);
        project = lyrics.project;

        const composition = advanceProject(project, character, 50, ZERO_EQUIPMENT, 5, undefined, sequenceRng([50, 50, 50]));
        expect(composition.result.actionId).toBe(SONG_STAGE_IDS[1]);
        project = composition.project;

        const recording = advanceProject(project, character, 50, ZERO_EQUIPMENT, 5, undefined, sequenceRng([50, 50, 50]));
        expect(recording.result.actionId).toBe(SONG_STAGE_IDS[2]);
        expect(recording.completedSong).toBeDefined();

        const song = recording.completedSong!;
        expect(song.genre).toBe("idol");
        expect(song.releaseDay).toBe(5);
        // 全工程スコア7（満点）→ base1.0+7×(1/7)=2.0（§8.3の上限値と一致）
        expect(song.qualityScore).toBeCloseTo(2.0);
        expect(song.popularity).toBe(1.0);
        expect(song.liveBoosts).toEqual([]);
    });

    it("作詞・作曲・レコーディングはジャンルで既存ロールの1点が置き換わる（合計7点維持）", () => {
        const character = makeCharacter();
        const project = startSongProject("idol"); // idol→charm

        const lyrics = advanceProject(project, character, 50, ZERO_EQUIPMENT, 0, undefined, sequenceRng([50, 50, 50]));
        expect(lyrics.result.rolls.reduce((sum, r) => sum + r.weight, 0)).toBe(7);
        expect(lyrics.result.rolls.some((r) => r.param === "charm")).toBe(true);
        expect(lyrics.result.rolls.some((r) => r.param === "luck")).toBe(false);

        const composition = advanceProject(
            lyrics.project,
            character,
            50,
            ZERO_EQUIPMENT,
            0,
            undefined,
            sequenceRng([50, 50, 50])
        );
        expect(composition.result.rolls.reduce((sum, r) => sum + r.weight, 0)).toBe(7);
        expect(composition.result.rolls.some((r) => r.param === "charm")).toBe(true);

        const recording = advanceProject(
            composition.project,
            character,
            50,
            ZERO_EQUIPMENT,
            0,
            undefined,
            sequenceRng([50, 50, 50])
        );
        expect(recording.result.rolls.reduce((sum, r) => sum + r.weight, 0)).toBe(7);
        // レコーディングはスタミナ2点がジャンルに置き換わる
        expect(recording.result.rolls.some((r) => r.param === "staminaParam")).toBe(false);
        expect(recording.result.rolls.find((r) => r.param === "charm")?.weight).toBe(2);
    });

    it("PC補正は作曲工程の実効値に加算され、作詞工程には適用されない", () => {
        const character = makeCharacter();
        const equipment: Equipment = { ...ZERO_EQUIPMENT, pc: { level: 5 } }; // 補正+15
        let project = startSongProject("idol");

        const lyrics = advanceProject(project, character, 50, equipment, 0, undefined, sequenceRng([50, 50, 50]));
        expect(lyrics.result.rolls.every((r) => r.effectiveValue === 100)).toBe(true);
        project = lyrics.project;

        const composition = advanceProject(project, character, 50, equipment, 0, undefined, sequenceRng([50, 50, 50]));
        expect(composition.result.rolls.every((r) => r.effectiveValue === 115)).toBe(true);
    });
});
