"use client";

import { useEffect, useState } from "react";
import { STREAM_ACTIONS } from "@/src/engine/actions";
import { BALANCE } from "@/src/engine/balance";
import { equipmentBonus, equipmentUpgradeCost } from "@/src/engine/equipment";
import type { JobId } from "@/src/engine/jobs";
import { lessonCost, LESSONS, type LessonId } from "@/src/engine/lessons";
import type { EquipmentSlot, Genre, ParamKey, Video } from "@/src/engine/types";
import { useGameStore } from "@/src/store/gameStore";
import { Button, FansDisplay, MoneyDisplay, ParamBar, RollResultLine, ScoreBandBadge } from "@/src/ui/components";
import {
    EQUIPMENT_LABELS,
    GENRE_LABELS,
    PARAM_LABELS,
    SONG_STAGE_LABELS,
    VIDEO_KIND_LABELS,
    VIDEO_STAGE_LABELS,
} from "@/src/ui/labels";
import { SONG_STAGE_IDS, VIDEO_STAGE_IDS } from "@/src/engine/project";

const GENRES: Genre[] = ["idol", "rock", "ballad", "edm", "comedy", "rap"];
const VIDEO_KINDS: Video["kind"][] = ["song", "dance", "variety"];
const EQUIPMENT_SLOTS: EquipmentSlot[] = ["mic", "camera", "pc", "outfit", "practiceEnv"];

/** 撮影ロールにジャンル差し込みがある動画種別（§6.2） */
function videoKindHasGenre(kind: Video["kind"]): boolean {
    return kind === "song" || kind === "dance";
}

export function GameScreen() {
    const [genre, setGenre] = useState<Genre>("idol");
    const [lessonTargets, setLessonTargets] = useState<Partial<Record<LessonId, ParamKey>>>({});
    const [videoKind, setVideoKind] = useState<Video["kind"]>("song");
    const [videoGenre, setVideoGenre] = useState<Genre | "">("");
    const [songGenre, setSongGenre] = useState<Genre>("idol");

    useEffect(() => {
        useGameStore.persist.rehydrate();
    }, []);

    const day = useGameStore((s) => s.day);
    const ap = useGameStore((s) => s.ap);
    const money = useGameStore((s) => s.money);
    const fans = useGameStore((s) => s.fans);
    const character = useGameStore((s) => s.character);
    const equipment = useGameStore((s) => s.equipment);
    const project = useGameStore((s) => s.project);
    const lastResult = useGameStore((s) => s.lastResult);
    const performStream = useGameStore((s) => s.performStream);
    const rest = useGameStore((s) => s.rest);
    const performLesson = useGameStore((s) => s.performLesson);
    const performJob = useGameStore((s) => s.performJob);
    const startVideoProject = useGameStore((s) => s.startVideoProject);
    const startSongProject = useGameStore((s) => s.startSongProject);
    const performProjectStage = useGameStore((s) => s.performProjectStage);
    const upgradeEquipment = useGameStore((s) => s.upgradeEquipment);

    const canAct = ap > 0;
    /** スタミナが足りないアクションは休息を挟まないと選べない */
    const hasStamina = (cost: number) => character.stamina >= cost;

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
                    <Button
                        disabled={!canAct || !hasStamina(STREAM_ACTIONS.chatStream.staminaCost)}
                        onClick={() => performStream("chatStream")}
                    >
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
                    <Button
                        disabled={!canAct || !hasStamina(STREAM_ACTIONS.songStream.staminaCost)}
                        onClick={() => performStream("songStream", genre)}
                    >
                        歌枠配信
                    </Button>

                    <Button variant="secondary" disabled={!canAct} onClick={() => rest()}>
                        休息
                    </Button>
                </div>
            </section>

            <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-100">アルバイト</h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-100">
                    固定賃金の安定収入。ファンは増えないが、序盤の資金源として配信より安定している。
                </p>
                <div className="flex flex-wrap items-center gap-2">
                    {(Object.keys(BALANCE.jobs.list) as JobId[]).map((jobId) => {
                        const def = BALANCE.jobs.list[jobId];
                        return (
                            <Button
                                key={jobId}
                                variant="secondary"
                                disabled={!canAct || !hasStamina(def.staminaCost)}
                                onClick={() => performJob(jobId)}
                            >
                                {def.label}（{def.wage}G）
                            </Button>
                        );
                    })}
                </div>
            </section>

            <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-100">レッスン</h2>
                <div className="flex flex-col gap-2">
                    {Object.values(LESSONS).map((def) => {
                        const resolvedTarget = def.fixedTarget ?? lessonTargets[def.id] ?? def.targetOptions![0];
                        const cost = Math.floor(lessonCost(character.params, resolvedTarget));
                        const affordable = money >= cost;
                        const staminaOk = hasStamina(def.staminaCost);

                        return (
                            <div key={def.id} className="flex flex-wrap items-center gap-2">
                                <span className="w-32 shrink-0 text-sm text-zinc-900 dark:text-zinc-50">
                                    {def.label}
                                </span>
                                {def.targetOptions && (
                                    <select
                                        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                                        value={resolvedTarget}
                                        onChange={(event) =>
                                            setLessonTargets((prev) => ({
                                                ...prev,
                                                [def.id]: event.target.value as ParamKey,
                                            }))
                                        }
                                        aria-label={`${def.label}の対象`}
                                    >
                                        {def.targetOptions.map((param) => (
                                            <option key={param} value={param}>
                                                {PARAM_LABELS[param]}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                <span className="text-xs text-zinc-600 dark:text-zinc-100">費用 {cost}G</span>
                                <Button
                                    variant="secondary"
                                    disabled={!canAct || !affordable || !staminaOk}
                                    onClick={() => performLesson(def.id, resolvedTarget)}
                                >
                                    受講
                                </Button>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-100">動画/楽曲制作</h2>
                {project ? (
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm text-zinc-900 dark:text-zinc-50">
                            {project.kind === "video" ? VIDEO_KIND_LABELS[project.videoKind!] : "楽曲"}制作中：
                            工程 {project.currentStage + 1}/3（
                            {project.kind === "video"
                                ? VIDEO_STAGE_LABELS[VIDEO_STAGE_IDS[project.currentStage]]
                                : SONG_STAGE_LABELS[SONG_STAGE_IDS[project.currentStage]]}
                            ）
                        </span>
                        <Button
                            disabled={!canAct || !hasStamina(BALANCE.activityStaminaCost.production)}
                            onClick={() => performProjectStage()}
                        >
                            工程を進める
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                className="rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                                value={videoKind}
                                onChange={(event) => setVideoKind(event.target.value as Video["kind"])}
                                aria-label="動画の種別"
                            >
                                {VIDEO_KINDS.map((kind) => (
                                    <option key={kind} value={kind}>
                                        {VIDEO_KIND_LABELS[kind]}
                                    </option>
                                ))}
                            </select>
                            {videoKindHasGenre(videoKind) && (
                                <select
                                    className="rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                                    value={videoGenre}
                                    onChange={(event) => setVideoGenre(event.target.value as Genre | "")}
                                    aria-label="動画のジャンル"
                                >
                                    <option value="">ジャンルなし</option>
                                    {GENRES.map((g) => (
                                        <option key={g} value={g}>
                                            {GENRE_LABELS[g]}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <Button
                                onClick={() =>
                                    startVideoProject(
                                        videoKind,
                                        videoKindHasGenre(videoKind) && videoGenre ? videoGenre : undefined
                                    )
                                }
                            >
                                動画プロジェクト開始
                            </Button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                className="rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                                value={songGenre}
                                onChange={(event) => setSongGenre(event.target.value as Genre)}
                                aria-label="楽曲のジャンル"
                            >
                                {GENRES.map((g) => (
                                    <option key={g} value={g}>
                                        {GENRE_LABELS[g]}
                                    </option>
                                ))}
                            </select>
                            <Button onClick={() => startSongProject(songGenre)}>楽曲プロジェクト開始</Button>
                        </div>
                    </div>
                )}
            </section>

            <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-100">装備</h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-100">
                    強化するほど費用が跳ね上がる継続的な資金シンク。AP消費なしでいつでも強化できる。
                </p>
                <div className="flex flex-col gap-2">
                    {EQUIPMENT_SLOTS.map((slot) => {
                        const level = equipment[slot].level;
                        const cost = Math.floor(equipmentUpgradeCost(level));
                        const affordable = money >= cost;

                        return (
                            <div key={slot} className="flex flex-wrap items-center gap-2">
                                <span className="w-28 shrink-0 text-sm text-zinc-900 dark:text-zinc-50">
                                    {EQUIPMENT_LABELS[slot]}
                                </span>
                                <span className="text-xs text-zinc-600 dark:text-zinc-100">
                                    Lv{level}（補正+{equipmentBonus(level)}）
                                </span>
                                <span className="text-xs text-zinc-600 dark:text-zinc-100">強化費用 {cost}G</span>
                                <Button
                                    variant="secondary"
                                    disabled={!affordable}
                                    onClick={() => upgradeEquipment(slot)}
                                >
                                    強化
                                </Button>
                            </div>
                        );
                    })}
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
