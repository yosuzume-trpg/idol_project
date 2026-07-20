// =============================================================
// シード可能な乱数生成器（§14）— リプレイ・テスト用に決定的な乱数列を提供する
// =============================================================

import type { Rng } from "./types";

/** mulberry32アルゴリズムによる軽量PRNG */
export function createRng(seed: number): Rng {
    let state = seed >>> 0;

    const next = (): number => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const random = (): number => next();

    const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));

    const d100 = (): number => int(1, 100);

    return { d100, random, int };
}
