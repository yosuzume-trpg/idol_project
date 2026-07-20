// =============================================================
// IndexedDBストレージアダプタ — idb-keyvalをZustand persistのStateStorageに変換する
// IndexedDBアクセスはこの1箇所に隔離し、将来のリモート同期はここを差し替えるだけで済むようにする
// =============================================================

import { del, get, set } from "idb-keyval";
import type { StateStorage } from "zustand/middleware";

export const idbStorage: StateStorage = {
    getItem: async (name) => (await get(name)) ?? null,
    setItem: async (name, value) => {
        await set(name, value);
    },
    removeItem: async (name) => {
        await del(name);
    },
};
