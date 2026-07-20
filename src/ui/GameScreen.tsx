"use client";

import { useEffect, useState } from "react";
import { BALANCE } from "@/src/engine/balance";
import type { Genre } from "@/src/engine/types";
import { useGameStore } from "@/src/store/gameStore";
import { Button, FansDisplay, MoneyDisplay, ParamBar, RollResultLine, ScoreBandBadge } from "@/src/ui/components";
import { GENRE_LABELS, PARAM_LABELS } from "@/src/ui/labels";

const GENRES: Genre[] = ["idol", "rock", "ballad", "edm", "comedy", "rap"];

export function GameScreen() {
    const [genre, setGenre] = useState<Genre>("idol");

    useEffect(() => {
        useGameStore.persist.rehydrate();
    }, []);

    const day = useGameStore((s) => s.day);
    const ap = useGameStore((s) => s.ap);
    const money = useGameStore((s) => s.money);
    const fans = useGameStore((s) => s.fans);
    const character = useGameStore((s) => s.character);
    const lastResult = useGameStore((s) => s.lastResult);
    const performStream = useGameStore((s) => s.performStream);
    const rest = useGameStore((s) => s.rest);

    const canAct = ap > 0;

    return (
        <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
            <header className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                        {day + 1}日目 / {BALANCE.totalDays}日
                    </h1>
                    <span className="text-sm text-zinc-600 dark:text-zinc-100">残りAP: {ap} / {BALANCE.apPerDay}</span>
                </div>
                <div className="flex flex-wrap gap-4 text-lg text-zinc-900 dark:text-zinc-50">
                    <MoneyDisplay value={money} />
                    <FansDisplay value={fans} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <ParamBar label="スタミナ" value={character.stamina} max={character.staminaMax} />
                    <ParamBar label="メンタル" value={character.mental} max={BALANCE.mentalMax} />
                </div>
            </header>

            <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-100">アクション</h2>
                <div className="flex flex-wrap items-center gap-2">
                    <Button disabled={!canAct} onClick={() => performStream("chatStream")}>
                        雑談配信
                    </Button>

                    <select
                        className="rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        value={genre}
                        onChange={(event) => setGenre(event.target.value as Genre)}
                        aria-label="歌枠配信のジャンル"
                    >
                        {GENRES.map((g) => (
                            <option key={g} value={g}>
                                {GENRE_LABELS[g]}
                            </option>
                        ))}
                    </select>
                    <Button disabled={!canAct} onClick={() => performStream("songStream", genre)}>
                        歌枠配信
                    </Button>

                    <Button variant="secondary" disabled={!canAct} onClick={() => rest()}>
                        休息
                    </Button>
                </div>
            </section>

            <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-100">結果</h2>
                {lastResult ? (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <ScoreBandBadge band={lastResult.band} />
                            <span className="text-sm text-zinc-600 dark:text-zinc-100">
                                スコア {lastResult.score.toFixed(1)}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            {lastResult.rolls.map((outcome, i) => (
                                <RollResultLine key={`${outcome.param}-${i}`} outcome={outcome} />
                            ))}
                        </div>
                        <div className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-100">
                            <span>資金 {(lastResult.effects.money ?? 0) >= 0 ? "+" : ""}{Math.floor(lastResult.effects.money ?? 0)}G</span>
                            <span>
                                ファン {(lastResult.effects.fans ?? 0) >= 0 ? "+" : ""}
                                {Math.floor(lastResult.effects.fans ?? 0)}人
                            </span>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-zinc-600 dark:text-zinc-100">まだ行動していません。</p>
                )}
            </section>

            <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-100">パラメータ</h2>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {(["talk", "reaction", "vocalTechnique", "vocalExpression", "charm", "luck"] as const).map(
                        (param) => (
                            <ParamBar key={param} label={PARAM_LABELS[param]} value={character.params[param]} />
                        )
                    )}
                </div>
            </section>
        </div>
    );
}
