import type { ScoreBand } from "@/src/engine/types";
import { SCORE_BAND_LABELS } from "@/src/ui/labels";

type ScoreBandBadgeProps = {
    band: ScoreBand;
    className?: string;
};

const BAND_CLASSES: Record<ScoreBand, string> = {
    legendary: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300",
    great: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    good: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
    standard: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
    weak: "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-100",
    fail: "bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-100",
    accident: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
};

export function ScoreBandBadge({ band, className = "" }: ScoreBandBadgeProps) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${BAND_CLASSES[band]} ${className}`}
        >
            {SCORE_BAND_LABELS[band]}
        </span>
    );
}
