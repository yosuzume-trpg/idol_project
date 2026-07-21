"use client";

import { useState } from "react";
import type { Genre, Trend, TrendSize } from "@/src/engine/types";
import { useGameStore } from "@/src/store/gameStore";
import { Button, ConfirmDialog } from "@/src/ui/components";
import { GENRE_LABELS, PARAM_KEYS, PARAM_LABELS } from "@/src/ui/labels";

const GENRES: Genre[] = ["idol", "rock", "ballad", "edm", "comedy", "rap"];
const TREND_SIZES: TrendSize[] = ["S", "M", "L"];
const TREND_KINDS: Trend["kind"][] = ["game", "song"];

const inputClass =
    "w-24 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
const selectClass =
    "rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

/**
 * 開発用デバッグパネル（CLAUDE.md記載の正式機能）。
 * 1825日を手動プレイで検証するのは非現実的なため、日数スキップ・パラメータ直接編集・
 * 乱数シード固定・トレンド即時発生・GameStateダンプを提供する。本番ビルドでは呼び出し側が非表示にする
 */
export function DebugPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
    const [targetDay, setTargetDay] = useState(1);
    const [moneyInput, setMoneyInput] = useState(0);
    const [fansInput, setFansInput] = useState(0);
    const [staminaInput, setStaminaInput] = useState(0);
    const [mentalInput, setMentalInput] = useState(0);
    const [seedInput, setSeedInput] = useState(0);
    const [trendKind, setTrendKind] = useState<Trend["kind"]>("game");
    const [trendGenre, setTrendGenre] = useState<Genre>("idol");
    const [trendSize, setTrendSize] = useState<TrendSize>("M");

    const day = useGameStore((s) => s.day);
    const money = useGameStore((s) => s.money);
    const fans = useGameStore((s) => s.fans);
    const character = useGameStore((s) => s.character);
    const rngSeed = useGameStore((s) => s.rngSeed);
    const trends = useGameStore((s) => s.trends);

    const debugSkipDays = useGameStore((s) => s.debugSkipDays);
    const debugSetMoney = useGameStore((s) => s.debugSetMoney);
    const debugSetFans = useGameStore((s) => s.debugSetFans);
    const debugSetParam = useGameStore((s) => s.debugSetParam);
    const debugSetStamina = useGameStore((s) => s.debugSetStamina);
    const debugSetMental = useGameStore((s) => s.debugSetMental);
    const debugSetRngSeed = useGameStore((s) => s.debugSetRngSeed);
    const debugRandomizeRngSeed = useGameStore((s) => s.debugRandomizeRngSeed);
    const debugSpawnTrend = useGameStore((s) => s.debugSpawnTrend);
    const debugResetAll = useGameStore((s) => s.debugResetAll);

    if (!isOpen) {
        return (
            <div className="mx-auto max-w-2xl px-6">
                <Button variant="secondary" onClick={() => setIsOpen(true)}>
                    デバッグパネルを開く
                </Button>
            </div>
        );
    }

    // 永続化対象の関数を除いたGameState相当のダンプ（新しいフィールドが増えても追随できるよう汎用的に除外する）
    const dump = Object.fromEntries(
        Object.entries(useGameStore.getState()).filter(([, value]) => typeof value !== "function")
    );

    return (
        <div className="mx-auto flex max-w-2xl flex-col gap-4 rounded-lg border border-dashed border-amber-500 p-4">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                    開発用デバッグパネル（本番ビルドには表示されません）
                </h2>
                <div className="flex items-center gap-2">
                    <Button variant="danger" onClick={() => setIsResetConfirmOpen(true)}>
                        全リセット
                    </Button>
                    <Button variant="secondary" onClick={() => setIsOpen(false)}>
                        閉じる
                    </Button>
                </div>
            </div>

            <ConfirmDialog
                isOpen={isResetConfirmOpen}
                title="セーブデータを全リセット"
                message="現在の日数・資金・ファン数・パラメータ・動画/楽曲・装備などすべての進行状況が初期状態に戻ります。元に戻せません。よろしいですか？"
                confirmLabel="リセットする"
                danger
                onConfirm={() => {
                    debugResetAll();
                    setIsResetConfirmOpen(false);
                }}
                onCancel={() => setIsResetConfirmOpen(false)}
            />

            <section className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-100">日数スキップ（現在{day + 1}日目）</h3>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="secondary" onClick={() => debugSkipDays(1)}>+1日</Button>
                    <Button variant="secondary" onClick={() => debugSkipDays(7)}>+7日</Button>
                    <Button variant="secondary" onClick={() => debugSkipDays(30)}>+30日</Button>
                    <input
                        type="number"
                        className={inputClass}
                        value={targetDay}
                        onChange={(e) => setTargetDay(Number(e.target.value))}
                        aria-label="指定日（1始まり）"
                    />
                    <Button
                        variant="secondary"
                        disabled={targetDay <= day + 1}
                        onClick={() => debugSkipDays(targetDay - (day + 1))}
                    >
                        指定日へ
                    </Button>
                </div>
            </section>

            <section className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-100">
                    資金・ファン数（現在 {Math.floor(money)}G / {Math.floor(fans)}人）
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="number"
                        className={inputClass}
                        value={moneyInput}
                        onChange={(e) => setMoneyInput(Number(e.target.value))}
                        aria-label="資金の値"
                    />
                    <Button variant="secondary" onClick={() => debugSetMoney(moneyInput)}>
                        資金を設定
                    </Button>
                    <input
                        type="number"
                        className={inputClass}
                        value={fansInput}
                        onChange={(e) => setFansInput(Number(e.target.value))}
                        aria-label="ファン数の値"
                    />
                    <Button variant="secondary" onClick={() => debugSetFans(fansInput)}>
                        ファン数を設定
                    </Button>
                </div>
            </section>

            <section className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-100">
                    スタミナ/メンタル（現在 {Math.floor(character.stamina)}/{Math.floor(character.staminaMax)} ・{" "}
                    {Math.floor(character.mental)}/100）
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="number"
                        className={inputClass}
                        value={staminaInput}
                        onChange={(e) => setStaminaInput(Number(e.target.value))}
                        aria-label="スタミナの値"
                    />
                    <Button variant="secondary" onClick={() => debugSetStamina(staminaInput)}>
                        スタミナを設定
                    </Button>
                    <input
                        type="number"
                        className={inputClass}
                        value={mentalInput}
                        onChange={(e) => setMentalInput(Number(e.target.value))}
                        aria-label="メンタルの値"
                    />
                    <Button variant="secondary" onClick={() => debugSetMental(mentalInput)}>
                        メンタルを設定
                    </Button>
                </div>
            </section>

            <section className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-100">全パラメータ直接編集</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                    {PARAM_KEYS.map((param) => (
                        <div key={param} className="flex items-center gap-1">
                            <span className="w-20 shrink-0 truncate text-xs text-zinc-900 dark:text-zinc-50">
                                {PARAM_LABELS[param]}
                            </span>
                            <input
                                type="number"
                                className={`${inputClass} w-16`}
                                defaultValue={Math.floor(character.params[param])}
                                onBlur={(e) => debugSetParam(param, Number(e.target.value))}
                                aria-label={`${PARAM_LABELS[param]}の値`}
                            />
                        </div>
                    ))}
                </div>
            </section>

            <section className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-100">乱数シード（現在: {rngSeed}）</h3>
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="number"
                        className={inputClass}
                        value={seedInput}
                        onChange={(e) => setSeedInput(Number(e.target.value))}
                        aria-label="固定するシード値"
                    />
                    <Button variant="secondary" onClick={() => debugSetRngSeed(seedInput)}>
                        固定する
                    </Button>
                    <Button variant="secondary" onClick={() => debugRandomizeRngSeed()}>
                        解除（ランダムに戻す）
                    </Button>
                </div>
            </section>

            <section className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-100">
                    トレンド即時発生（現在{trends.length}件。トレンドシステム自体は未実装のためゲームプレイへの効果はまだありません）
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        className={selectClass}
                        value={trendKind}
                        onChange={(e) => setTrendKind(e.target.value as Trend["kind"])}
                        aria-label="トレンド種別"
                    >
                        {TREND_KINDS.map((k) => (
                            <option key={k} value={k}>
                                {k === "game" ? "ゲーム" : "楽曲"}
                            </option>
                        ))}
                    </select>
                    <select
                        className={selectClass}
                        value={trendGenre}
                        onChange={(e) => setTrendGenre(e.target.value as Genre)}
                        aria-label="トレンドジャンル"
                    >
                        {GENRES.map((g) => (
                            <option key={g} value={g}>
                                {GENRE_LABELS[g]}
                            </option>
                        ))}
                    </select>
                    <select
                        className={selectClass}
                        value={trendSize}
                        onChange={(e) => setTrendSize(e.target.value as TrendSize)}
                        aria-label="トレンド規模"
                    >
                        {TREND_SIZES.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                    <Button variant="secondary" onClick={() => debugSpawnTrend(trendKind, trendGenre, trendSize)}>
                        発生させる
                    </Button>
                </div>
            </section>

            <section className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-100">GameStateダンプ</h3>
                <pre className="max-h-64 overflow-auto rounded-md bg-zinc-100 p-2 text-xs text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
                    {JSON.stringify(dump, null, 2)}
                </pre>
            </section>
        </div>
    );
}
