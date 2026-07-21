// =============================================================
// 動画/楽曲制作プロジェクト（§6.2, §6.3） — 撮影/編集/サムネ・作詞/作曲/レコーディングの3工程進行
// 同時に進行できるプロジェクトは1つのみ（GameState.project）。
// 外注（交渉ロールによる工程スキップ）は交渉システム未実装のため対象外（マイルストーン9以降で検討）
// =============================================================

import { BALANCE } from "./balance";
import { requirement } from "./economy";
import { equipmentBonus } from "./equipment";
import { GENRE_ROLL_PARAM } from "./genre";
import { activityParamGains, experienceParamGains, mergeParamGains } from "./growth";
import { isSuccessBand, mentalPenalty, resolveRolls, scoreBand } from "./judge";
import type { ActionResult, Character, Equipment, Genre, ParamKey, Project, Rng, RollSpec, Song, Video } from "./types";

export type VideoStageId = "shoot" | "edit" | "publish";
export type SongStageId = "lyrics" | "composition" | "recording";

export const VIDEO_STAGE_IDS: readonly VideoStageId[] = ["shoot", "edit", "publish"];
export const SONG_STAGE_IDS: readonly SongStageId[] = ["lyrics", "composition", "recording"];

/**
 * 基本ロールが単独で7点に達しているアクション（歌動画撮影・作詞・作曲・レコーディング）に
 * ジャンルを差し込む場合、既存ロールの1点をジャンル対応パラメータへ**置き換える**（合計7点を厳守）。
 * 歌枠配信のように基本ロールが6点で「＋ジャンル1」を加算する形とは異なるので注意（既存実装は加算のまま維持）
 */
function withGenreReplacement(rolls: RollSpec[], replaceParam: ParamKey, genre: Genre | undefined): RollSpec[] {
    if (!genre) return rolls;
    const genreParam = GENRE_ROLL_PARAM[genre];
    return rolls.map((roll) => (roll.param === replaceParam ? { param: genreParam, weight: roll.weight } : roll));
}

// ---- 動画: 撮影/編集/サムネ・公開のロール構成（§6.2） ----

function shootRolls(videoKind: Video["kind"], genre: Genre | undefined): RollSpec[] {
    if (videoKind === "song") {
        return withGenreReplacement(
            [
                { param: "vocalTechnique", weight: 2 },
                { param: "vocalExpression", weight: 2 },
                { param: "staminaParam", weight: 2 },
                { param: "luck", weight: 1 },
            ],
            "luck",
            genre
        );
    }
    if (videoKind === "dance") {
        return withGenreReplacement(
            [
                { param: "danceTechnique", weight: 2 },
                { param: "danceExpression", weight: 2 },
                { param: "staminaParam", weight: 2 },
                { param: "luck", weight: 1 },
            ],
            "luck",
            genre
        );
    }
    // 企画（variety）動画: 仕様書に数値記載なし。雑談配信に近い構成で暫定定義（ジャンル差し込みなし、残課題）
    return [
        { param: "idea", weight: 2 },
        { param: "talk", weight: 2 },
        { param: "staminaParam", weight: 2 },
        { param: "luck", weight: 1 },
    ];
}

const EDIT_ROLLS: RollSpec[] = [
    { param: "editTechnique", weight: 3 },
    { param: "editComposition", weight: 3 },
    { param: "staminaParam", weight: 1 },
];

const PUBLISH_ROLLS: RollSpec[] = [
    { param: "editComposition", weight: 2 },
    { param: "idea", weight: 2 },
    { param: "charisma", weight: 1 },
    { param: "luck", weight: 2 },
];

function videoStageRolls(stageIndex: number, videoKind: Video["kind"], genre: Genre | undefined): RollSpec[] {
    if (stageIndex === 0) return shootRolls(videoKind, genre);
    if (stageIndex === 1) return EDIT_ROLLS;
    return PUBLISH_ROLLS;
}

// ---- 楽曲: 作詞/作曲/レコーディングのロール構成（§6.3） ----

function lyricsRolls(genre: Genre | undefined): RollSpec[] {
    return withGenreReplacement(
        [
            { param: "lyrics", weight: 4 },
            { param: "mentalParam", weight: 2 },
            { param: "luck", weight: 1 },
        ],
        "luck",
        genre
    );
}

function compositionRolls(genre: Genre | undefined): RollSpec[] {
    return withGenreReplacement(
        [
            { param: "composition", weight: 4 },
            { param: "idea", weight: 2 },
            { param: "luck", weight: 1 },
        ],
        "luck",
        genre
    );
}

function recordingRolls(genre: Genre | undefined): RollSpec[] {
    return withGenreReplacement(
        [
            { param: "vocalTechnique", weight: 3 },
            { param: "vocalExpression", weight: 2 },
            { param: "staminaParam", weight: 2 },
        ],
        "staminaParam",
        genre
    );
}

function songStageRolls(stageIndex: number, genre: Genre | undefined): RollSpec[] {
    if (stageIndex === 0) return lyricsRolls(genre);
    if (stageIndex === 1) return compositionRolls(genre);
    return recordingRolls(genre);
}

/**
 * 工程ごとの装備補正（§12.1）。カメラ・照明→動画の撮影・サムネ/公開工程、PC・ソフト→動画の編集工程・楽曲の作曲工程。
 * 作詞(lyrics)工程は「作曲系ロール」に含めない（仕様書内で作詞/作曲は一貫して別工程として扱われているため）
 */
function stageEquipmentBonus(kind: Project["kind"], stageIndex: number, equipment: Equipment): number {
    if (kind === "video") {
        if (stageIndex === 0 || stageIndex === 2) return equipmentBonus(equipment.camera.level); // 撮影／サムネ・公開
        return equipmentBonus(equipment.pc.level); // 編集
    }
    if (stageIndex === 1) return equipmentBonus(equipment.pc.level); // 作曲
    return 0; // 作詞・レコーディング
}

// ---- 開始 ----

/** 動画プロジェクトを開始する（歌/ダンス動画はジャンル任意、企画動画はジャンルなし） */
export function startVideoProject(videoKind: Video["kind"], genre?: Genre): Project {
    return { kind: "video", videoKind, genre, stageScores: [], currentStage: 0 };
}

/** 楽曲プロジェクトを開始する（ジャンルは楽曲の必須属性のため指定必須） */
export function startSongProject(genre: Genre): Project {
    return { kind: "song", genre, stageScores: [], currentStage: 0 };
}

// ---- 工程スコア → thumbnailScore/qualityScore/品質 変換（§8.2, §8.3） ----

function scoreToFactor(score: number, base: number, slope: number): number {
    return base + score * slope;
}

function finalizeVideo(project: Project, stageScores: number[], day: number, fans: number, previousVideoDay: number | undefined): Video {
    const { base, slope } = BALANCE.video.scoreToQuality;
    // 撮影・編集の平均→品質スコア、サムネ/公開工程のスコア→サムネスコア（§8.2の反映方式、マイルストーン6で確定）
    const qualityScore = scoreToFactor((stageScores[0] + stageScores[1]) / 2, base, slope);
    const thumbnailScore = scoreToFactor(stageScores[2], base, slope);
    const gapDays = previousVideoDay === undefined ? Infinity : day - previousVideoDay;
    const reachMultiplier = 1 - Math.exp(-gapDays / BALANCE.video.fatigueTau);

    return {
        id: `video-${day}`,
        title: `${day + 1}日目の動画`, // タイトル生成UIは未実装（残課題）
        kind: project.videoKind!,
        genre: project.genre,
        releaseDay: day,
        fansAtRelease: fans,
        thumbnailScore,
        qualityScore,
        reachMultiplier,
        totalViews: 0,
        totalIncome: 0,
        archived: false,
    };
}

function finalizeSong(project: Project, stageScores: number[], day: number, fans: number): Song {
    const { base, slope } = BALANCE.song.scoreToQuality;
    const avgScore = (stageScores[0] + stageScores[1] + stageScores[2]) / 3;
    const qualityScore = scoreToFactor(avgScore, base, slope);

    return {
        id: `song-${day}`,
        title: `${day + 1}日目の楽曲`, // タイトル生成UIは未実装（残課題）
        genre: project.genre!,
        releaseDay: day,
        fansAtRelease: fans,
        qualityScore,
        popularity: 1.0, // トレンド未実装のため発売時固定（残課題、マイルストーン7で連動させる）
        totalDownloads: 0,
        totalIncome: 0,
        liveBoosts: [],
    };
}

// ---- 工程進行 ----

export type ProjectStageExecution = {
    result: ActionResult;
    /** 更新後のプロジェクト。最終工程完了時はcompletedVideo/completedSongが入り、呼び出し側でprojectをnullに戻す */
    project: Project;
    staminaDelta: number;
    mentalDelta: number;
    completedVideo?: Video;
    completedSong?: Song;
};

/** プロジェクトの現在工程を1回実行する。最終工程完了時は動画/楽曲を確定させて返す */
export function advanceProject(
    project: Project,
    character: Character,
    fans: number,
    equipment: Equipment,
    day: number,
    previousVideoDay: number | undefined,
    rng: Rng
): ProjectStageExecution {
    const stageCount = 3;
    const specs =
        project.kind === "video"
            ? videoStageRolls(project.currentStage, project.videoKind!, project.genre)
            : songStageRolls(project.currentStage, project.genre);

    const req = requirement(fans);
    const penalty = mentalPenalty(character.mental);
    const bonus = stageEquipmentBonus(project.kind, project.currentStage, equipment);
    const { outcomes, score } = resolveRolls(
        specs,
        character.params,
        req,
        character.params.luck,
        rng,
        penalty,
        bonus
    );
    const hasFumble = outcomes.some((outcome) => outcome.fumble);
    const { band, scoreCoef } = scoreBand(score, hasFumble);

    // 動画/音楽の実行は§3.1の活動経験値対象（レッスン対応パラメータ）＋経験系パラメータの確率成長の両方が入る
    const paramGains = mergeParamGains(activityParamGains(outcomes), experienceParamGains(outcomes, isSuccessBand(band), rng));
    const mentalDelta = -BALANCE.activityMentalCost - (band === "accident" ? BALANCE.accidentMentalDamage : 0);
    const staminaDelta = -BALANCE.activityStaminaCost.production;

    const stageScores = [...project.stageScores, score];
    const nextStage = project.currentStage + 1;
    const actionId = project.kind === "video" ? VIDEO_STAGE_IDS[project.currentStage] : SONG_STAGE_IDS[project.currentStage];

    const result: ActionResult = {
        actionId,
        rolls: outcomes,
        score,
        band,
        scoreCoef,
        effects: { paramGains, mentalDelta },
    };

    const updatedProject: Project = { ...project, stageScores, currentStage: nextStage };

    if (nextStage < stageCount) {
        return { result, project: updatedProject, staminaDelta, mentalDelta };
    }

    if (project.kind === "video") {
        const completedVideo = finalizeVideo(project, stageScores, day, fans, previousVideoDay);
        return { result, project: updatedProject, staminaDelta, mentalDelta, completedVideo };
    }
    const completedSong = finalizeSong(project, stageScores, day, fans);
    return { result, project: updatedProject, staminaDelta, mentalDelta, completedSong };
}
