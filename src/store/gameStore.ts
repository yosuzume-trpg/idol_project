// =============================================================
// ゲームストア（Zustand） — engineを呼び出す薄い層。ロジック本体はsrc/engineに置く
// 永続化はIndexedDB（idb-keyval経由）。SSR/静的書き出し時はrehydrateしない（skipHydration）
// =============================================================

"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { applyRest, executeStreamAction, STREAM_ACTIONS, type StreamActionId } from "@/src/engine/actions";
import { BALANCE } from "@/src/engine/balance";
import { runDailyBatch } from "@/src/engine/dailyBatch";
import { staminaMax } from "@/src/engine/economy";
import { equipmentUpgradeCost, upgradeEquipmentSlot } from "@/src/engine/equipment";
import { executeJob, type JobId } from "@/src/engine/jobs";
import { executeLesson, lessonCost, LESSONS, type LessonId } from "@/src/engine/lessons";
import {
    advanceProject,
    startSongProject as createSongProject,
    startVideoProject as createVideoProject,
} from "@/src/engine/project";
import { createRng } from "@/src/engine/rng";
import type {
    ActionResult,
    Character,
    Equipment,
    EquipmentSlot,
    GameState,
    Genre,
    ParamKey,
    Params,
    Trend,
    TrendSize,
    Video,
} from "@/src/engine/types";
import { CURRENT_SAVE_VERSION, migrateSaveData } from "./migrations";
import { idbStorage } from "./storage";

const INITIAL_PARAMS: Params = {
    vocalTechnique: BALANCE.paramBase,
    vocalExpression: BALANCE.paramBase,
    danceTechnique: BALANCE.paramBase,
    danceExpression: BALANCE.paramBase,
    editTechnique: BALANCE.paramBase,
    editComposition: BALANCE.paramBase,
    lyrics: BALANCE.paramBase,
    composition: BALANCE.paramBase,
    talk: BALANCE.paramBase,
    reaction: BALANCE.paramBase,
    idea: BALANCE.paramBase,
    // キャラメイクUI（§4）未実装のための暫定値。3d6×2の期待値(21)を採用
    luck: 21,
    staminaParam: BALANCE.paramBase,
    mentalParam: BALANCE.paramBase,
    charisma: BALANCE.paramBase,
    charm: BALANCE.paramBase,
    negotiation: BALANCE.paramBase,
    gameSkill: BALANCE.paramBase,
};

const INITIAL_EQUIPMENT: Equipment = {
    mic: { level: 0 },
    camera: { level: 0 },
    pc: { level: 0 },
    outfit: { level: 0 },
    practiceEnv: { level: 0 },
};

function createInitialGameState(): GameState {
    const initialStaminaMax = staminaMax(INITIAL_PARAMS.staminaParam);
    return {
        day: 0,
        ap: BALANCE.apPerDay,
        playableCharacterId: "default",
        character: {
            name: "配信者",
            params: INITIAL_PARAMS,
            stamina: initialStaminaMax,
            staminaMax: initialStaminaMax,
            mental: BALANCE.mentalMax,
        },
        npcs: [],
        money: 0,
        fans: 0,
        equipment: INITIAL_EQUIPMENT,
        videos: [],
        songs: [],
        project: null,
        ownedGames: [],
        trends: [],
        trendSnapshot: null,
        scheduledLive: null,
        clearedVenues: [],
        idleSchedule: ["auto", "auto", "auto"],
        history: [],
    };
}

function applyParamGains(params: Params, gains: Partial<Params> | undefined): Params {
    if (!gains) return params;
    const next = { ...params };
    for (const key of Object.keys(gains) as ParamKey[]) {
        next[key] = (next[key] ?? 0) + (gains[key] ?? 0);
    }
    return next;
}

/**
 * パラメータ上昇・スタミナ/メンタル増減をまとめてキャラクターへ適用する。
 * スタミナ上限（§2.2）はstaminaParamに連動するため、パラメータ変化のたびに再計算する
 */
function applyGrowth(
    character: Character,
    gains: Partial<Params> | undefined,
    staminaDelta: number,
    mentalDelta: number
): Character {
    const params = applyParamGains(character.params, gains);
    const nextStaminaMax = staminaMax(params.staminaParam);
    return {
        ...character,
        params,
        staminaMax: nextStaminaMax,
        stamina: Math.max(0, Math.min(nextStaminaMax, character.stamina + staminaDelta)),
        mental: Math.max(0, Math.min(BALANCE.mentalMax, character.mental + mentalDelta)),
    };
}

export type GameStore = GameState & {
    version: number;
    rngSeed: number;
    /** 直近のアクション結果（UI表示用。休息時などはnull） */
    lastResult: ActionResult | null;
    performStream: (actionId: StreamActionId, genre?: Genre) => void;
    rest: () => void;
    performLesson: (lessonId: LessonId) => void;
    startVideoProject: (videoKind: Video["kind"], genre?: Genre) => void;
    startSongProject: (genre: Genre) => void;
    performProjectStage: () => void;
    performJob: (jobId: JobId) => void;
    upgradeEquipment: (slot: EquipmentSlot) => void;

    // ---- 開発用デバッグパネル（CLAUDE.md記載の正式機能。本番ビルドではUI非表示） ----
    debugSkipDays: (days: number) => void;
    debugSetMoney: (value: number) => void;
    debugSetFans: (value: number) => void;
    debugSetParam: (param: ParamKey, value: number) => void;
    debugSetStamina: (value: number) => void;
    debugSetMental: (value: number) => void;
    debugSetRngSeed: (seed: number) => void;
    debugRandomizeRngSeed: () => void;
    debugSpawnTrend: (kind: Trend["kind"], genre: Genre, size: TrendSize) => void;
    /** セーブデータを初期状態に戻す（IndexedDBは次回の自動persistで上書きされる） */
    debugResetAll: () => void;
};

export const useGameStore = create<GameStore>()(
    persist(
        (set, get) => {
            /** 日次バッチ＋深夜回復＋AP補充を1日分実行する（APの残量は問わない） */
            function runOneDay() {
                const state = get();
                const batch = runDailyBatch({
                    day: state.day,
                    fans: state.fans,
                    money: state.money,
                    videos: state.videos,
                    songs: state.songs,
                });
                const nextDay = state.day + 1;
                const character: Character = {
                    ...state.character,
                    stamina: Math.min(
                        state.character.staminaMax,
                        state.character.stamina + BALANCE.nightlyStaminaRecovery
                    ),
                    mental: Math.min(BALANCE.mentalMax, state.character.mental + BALANCE.nightlyMentalRecovery),
                };

                set({
                    day: nextDay,
                    ap: BALANCE.apPerDay,
                    fans: batch.fans,
                    money: batch.money,
                    videos: batch.videos,
                    songs: batch.songs,
                    character,
                    history: [...state.history, { day: nextDay, fans: batch.fans, money: batch.money }],
                });
            }

            /** その日のAPを使い切っていたら次の日へ進める（通常プレイ専用。デバッグ日数スキップはrunOneDayを直接呼ぶ） */
            function advanceDayIfNeeded() {
                if (get().ap > 0) return;
                runOneDay();
            }

            /** 1日3AP・1アクション1APなので、その日の消費AP数を通し番号にしてシードをずらす */
            function rngForThisAction(state: GameStore) {
                const actionIndex = BALANCE.apPerDay - state.ap;
                return createRng(state.rngSeed + state.day * 1000 + actionIndex);
            }

            return {
                ...createInitialGameState(),
                version: CURRENT_SAVE_VERSION,
                // 初回起動時のみ使用される初期シード。既存セーブがあればpersistで上書きされる
                rngSeed: Date.now() >>> 0,
                lastResult: null,

                performStream: (actionId, genre) => {
                    const state = get();
                    if (state.ap <= 0) return;
                    if (state.character.stamina < STREAM_ACTIONS[actionId].staminaCost) return;

                    const rng = rngForThisAction(state);
                    const execution = executeStreamAction(
                        actionId,
                        state.character,
                        state.fans,
                        state.equipment,
                        genre,
                        rng
                    );
                    const character = applyGrowth(
                        state.character,
                        execution.result.effects.paramGains,
                        execution.staminaDelta,
                        execution.mentalDelta
                    );

                    set({
                        ap: state.ap - 1,
                        money: Math.max(0, state.money + (execution.result.effects.money ?? 0)),
                        fans: Math.max(0, state.fans + (execution.result.effects.fans ?? 0)),
                        character,
                        lastResult: execution.result,
                    });

                    advanceDayIfNeeded();
                },

                rest: () => {
                    const state = get();
                    if (state.ap <= 0) return;

                    set({ ap: state.ap - 1, character: applyRest(state.character), lastResult: null });
                    advanceDayIfNeeded();
                },

                performLesson: (lessonId) => {
                    const state = get();
                    if (state.ap <= 0) return;

                    const def = LESSONS[lessonId];
                    const cost = lessonCost(state.character.params, def.target);
                    if (state.money < cost) return;
                    if (state.character.stamina < def.staminaCost) return;

                    const rng = rngForThisAction(state);
                    const execution = executeLesson(lessonId, state.character, state.equipment, rng);
                    const character = applyGrowth(
                        state.character,
                        execution.result.effects.paramGains,
                        execution.staminaDelta,
                        execution.mentalDelta
                    );

                    set({
                        ap: state.ap - 1,
                        money: Math.max(0, state.money - execution.cost),
                        character,
                        lastResult: execution.result,
                    });

                    advanceDayIfNeeded();
                },

                startVideoProject: (videoKind, genre) => {
                    const state = get();
                    if (state.project) return;
                    set({ project: createVideoProject(videoKind, genre) });
                },

                startSongProject: (genre) => {
                    const state = get();
                    if (state.project) return;
                    set({ project: createSongProject(genre) });
                },

                performProjectStage: () => {
                    const state = get();
                    if (state.ap <= 0 || !state.project) return;
                    if (state.character.stamina < BALANCE.activityStaminaCost.production) return;

                    const rng = rngForThisAction(state);
                    const previousVideoDay =
                        state.videos.length > 0 ? Math.max(...state.videos.map((v) => v.releaseDay)) : undefined;
                    const execution = advanceProject(
                        state.project,
                        state.character,
                        state.fans,
                        state.equipment,
                        state.day,
                        previousVideoDay,
                        rng
                    );
                    const character = applyGrowth(
                        state.character,
                        execution.result.effects.paramGains,
                        execution.staminaDelta,
                        execution.mentalDelta
                    );
                    const finished = execution.completedVideo !== undefined || execution.completedSong !== undefined;

                    set({
                        ap: state.ap - 1,
                        character,
                        project: finished ? null : execution.project,
                        videos: execution.completedVideo ? [...state.videos, execution.completedVideo] : state.videos,
                        songs: execution.completedSong ? [...state.songs, execution.completedSong] : state.songs,
                        lastResult: execution.result,
                    });

                    advanceDayIfNeeded();
                },

                performJob: (jobId) => {
                    const state = get();
                    if (state.ap <= 0) return;
                    if (state.character.stamina < BALANCE.jobs.list[jobId].staminaCost) return;

                    const rng = rngForThisAction(state);
                    const execution = executeJob(jobId, state.character, rng);
                    const character = applyGrowth(state.character, execution.result.effects.paramGains, execution.staminaDelta, 0);

                    set({
                        ap: state.ap - 1,
                        money: Math.max(0, state.money + (execution.result.effects.money ?? 0)),
                        character,
                        lastResult: execution.result,
                    });

                    advanceDayIfNeeded();
                },

                upgradeEquipment: (slot) => {
                    const state = get();
                    const cost = equipmentUpgradeCost(state.equipment[slot].level);
                    if (state.money < cost) return;

                    set({
                        money: state.money - cost,
                        equipment: upgradeEquipmentSlot(state.equipment, slot),
                    });
                },

                // ---- 開発用デバッグパネル ----

                debugSkipDays: (days) => {
                    for (let i = 0; i < days; i++) runOneDay();
                },

                debugSetMoney: (value) => set({ money: Math.max(0, value) }),

                debugSetFans: (value) => set({ fans: Math.max(0, value) }),

                debugSetParam: (param, value) => {
                    const state = get();
                    set({ character: { ...state.character, params: { ...state.character.params, [param]: value } } });
                },

                debugSetStamina: (value) => {
                    const state = get();
                    set({ character: { ...state.character, stamina: Math.max(0, Math.min(state.character.staminaMax, value)) } });
                },

                debugSetMental: (value) => {
                    const state = get();
                    set({ character: { ...state.character, mental: Math.max(0, Math.min(BALANCE.mentalMax, value)) } });
                },

                debugSetRngSeed: (seed) => set({ rngSeed: seed >>> 0 }),

                debugRandomizeRngSeed: () => set({ rngSeed: Date.now() >>> 0 }),

                debugSpawnTrend: (kind, genre, size) => {
                    const state = get();
                    const trend: Trend = {
                        id: `debug-${state.day}-${state.trends.length}`,
                        title: "デバッグトレンド", // タイトル自動生成は未実装（マイルストーン7残課題）
                        kind,
                        genre,
                        size,
                        startDay: state.day,
                    };
                    set({ trends: [...state.trends, trend] });
                },

                debugResetAll: () => {
                    set({
                        ...createInitialGameState(),
                        version: CURRENT_SAVE_VERSION,
                        rngSeed: Date.now() >>> 0,
                        lastResult: null,
                    });
                },
            };
        },
        {
            name: "idol-project-save",
            storage: createJSONStorage(() => idbStorage),
            version: CURRENT_SAVE_VERSION,
            migrate: migrateSaveData,
            // ビルド/静的書き出し時にIndexedDBへアクセスしないよう、rehydrateはクライアントで手動実行する
            skipHydration: true,
            // 関数は永続化対象から除外するだけなので中身は使わない
            /* eslint-disable @typescript-eslint/no-unused-vars */
            partialize: ({
                performStream,
                rest,
                performLesson,
                startVideoProject,
                startSongProject,
                performProjectStage,
                performJob,
                upgradeEquipment,
                debugSkipDays,
                debugSetMoney,
                debugSetFans,
                debugSetParam,
                debugSetStamina,
                debugSetMental,
                debugSetRngSeed,
                debugRandomizeRngSeed,
                debugSpawnTrend,
                debugResetAll,
                ...persisted
            }) => persisted,
            /* eslint-enable @typescript-eslint/no-unused-vars */
        }
    )
);
