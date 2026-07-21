// =============================================================
// 識別子 → 日本語表示ラベルの対訳表（CLAUDE.md 用語マッピングに準拠）
// UI表示用の定数のみ。ロジックは持たない
// =============================================================

import type { SongStageId, VideoStageId } from "@/src/engine/project";
import type { EquipmentSlot, Genre, ParamKey, ScoreBand, Video } from "@/src/engine/types";

export const PARAM_LABELS: Record<ParamKey, string> = {
    vocalTechnique: "ボーカル技術",
    vocalExpression: "ボーカル表現",
    danceTechnique: "ダンス技術",
    danceExpression: "ダンス表現",
    editTechnique: "編集技術",
    editComposition: "編集構成",
    lyrics: "作詞",
    composition: "作曲",
    talk: "トーク",
    reaction: "リアクション",
    idea: "アイデア",
    luck: "ラック",
    staminaParam: "スタミナ",
    mentalParam: "メンタル",
    charisma: "カリスマ",
    charm: "愛嬌",
    negotiation: "交渉",
    gameSkill: "ゲームスキル",
};

export const GENRE_LABELS: Record<Genre, string> = {
    idol: "アイドル系",
    rock: "ロック系",
    ballad: "バラード系",
    edm: "クラブ/EDM系",
    comedy: "ネタ曲系",
    rap: "ラップ系",
};

export const SCORE_BAND_LABELS: Record<ScoreBand, string> = {
    legendary: "伝説回",
    great: "大成功",
    good: "好調",
    standard: "標準成功",
    weak: "不発",
    fail: "失敗",
    accident: "事故",
};

export const VIDEO_KIND_LABELS: Record<Video["kind"], string> = {
    song: "歌動画",
    dance: "ダンス動画",
    variety: "企画動画",
};

export const VIDEO_STAGE_LABELS: Record<VideoStageId, string> = {
    shoot: "撮影",
    edit: "編集",
    publish: "サムネ/公開",
};

export const SONG_STAGE_LABELS: Record<SongStageId, string> = {
    lyrics: "作詞",
    composition: "作曲",
    recording: "レコーディング",
};

export const EQUIPMENT_LABELS: Record<EquipmentSlot, string> = {
    mic: "マイク",
    camera: "カメラ/照明",
    pc: "PC/ソフト",
    outfit: "衣装",
    practiceEnv: "練習環境",
};
