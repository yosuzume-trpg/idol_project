// =============================================================
// ゲームストア（Zustand） — engineを呼び出す薄い層。ロジック本体はsrc/engineに置く
// 永続化はIndexedDB（idb-keyval経由）。SSR/静的書き出し時はrehydrateしない（skipHydration）
// =============================================================

"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { applyRest, executeStreamAction, type StreamActionId } from "@/src/engine/actions";
import { BALANCE } from "@/src/engine/balance";
import { runDailyBatch } from "@/src/engine/dailyBatch";
import { createRng } from "@/src/engine/rng";
import type { ActionResult, Character, Equipment, GameState, Genre, Params, ParamKey } from "@/src/engine/types";
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
    return {
        day: 0,
        ap: BALANCE.apPerDay,
        playableCharacterId: "default",
        character: {
            name: "配信者",
            params: INITIAL_PARAMS,
            stamina: BALANCE.staminaMaxBase,
            staminaMax: BALANCE.staminaMaxBase,
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

export type GameStore = GameState & {
    version: number;
    rngSeed: number;
    /** 直近のアクション結果（UI表示用。休息時などはnull） */
    lastResult: ActionResult | null;
    performStream: (actionId: StreamActionId, genre?: Genre) => void;
    rest: () => void;
};

export const useGameStore = create<GameStore>()(
    persist(
        (set, get) => {
            function advanceDayIfNeeded() {
                const state = get();
                if (state.ap > 0) return;

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

            return {
                ...createInitialGameState(),
                version: CURRENT_SAVE_VERSION,
                // 初回起動時のみ使用される初期シード。既存セーブがあればpersistで上書きされる
                rngSeed: Date.now() >>> 0,
                lastResult: null,

                performStream: (actionId, genre) => {
                    const state = get();
                    if (state.ap <= 0) return;

                    // 1日3AP・1アクション1APなので、その日の消費AP数を通し番号にしてシードをずらす
                    const actionIndex = BALANCE.apPerDay - state.ap;
                    const rng = createRng(state.rngSeed + state.day * 1000 + actionIndex);
                    const execution = executeStreamAction(actionId, state.character, state.fans, genre, rng);

                    const character: Character = {
                        ...state.character,
                        stamina: Math.max(0, state.character.stamina + execution.staminaDelta),
                        mental: Math.max(
                            0,
                            Math.min(BALANCE.mentalMax, state.character.mental + execution.mentalDelta)
                        ),
                        params: applyParamGains(state.character.params, execution.result.effects.paramGains),
                    };

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
            };
        },
        {
            name: "idol-project-save",
            storage: createJSONStorage(() => idbStorage),
            version: CURRENT_SAVE_VERSION,
            migrate: migrateSaveData,
            // ビルド/静的書き出し時にIndexedDBへアクセスしないよう、rehydrateはクライアントで手動実行する
            skipHydration: true,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars -- 関数は永続化対象から除外するだけなので中身は使わない
            partialize: ({ performStream, rest, ...persisted }) => persisted,
        }
    )
);
