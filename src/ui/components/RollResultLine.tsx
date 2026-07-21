import type { RollOutcome } from "@/src/engine/types";
import { PARAM_LABELS } from "@/src/ui/labels";

// U+FE0E（テキスト異体字セレクタ）を付与し、カラー絵文字フォントへのフォールバックを防ぐ
type RollSymbol = "◎︎" | "○︎" | "✕︎" | "☠︎";

type RollResultLineProps = {
    outcome: RollOutcome;
    className?: string;
};

const SYMBOL_CLASSES: Record<RollSymbol, string> = {
    "◎︎": "text-amber-500",
    "○︎": "text-emerald-500",
    "✕︎": "text-zinc-400 dark:text-zinc-200",
    "☠︎": "text-red-500",
};

function symbolFor(outcome: RollOutcome): RollSymbol {
    if (outcome.critical) return "◎︎";
    if (outcome.fumble) return "☠︎";
    return outcome.success ? "○︎" : "✕︎";
}

export function RollResultLine({ outcome, className = "" }: RollResultLineProps) {
    const symbol = symbolFor(outcome);

    return (
        <div className={`flex items-center justify-between gap-2 text-sm ${className}`}>
            <span className="text-zinc-600 dark:text-zinc-100">{PARAM_LABELS[outcome.param]}</span>
            <span className="flex items-center gap-2">
                <span className="tabular-nums text-xs text-zinc-500 dark:text-zinc-300">
                    自分{Math.floor(outcome.effectiveValue)} / 要求{Math.floor(outcome.requirement)}
                </span>
                <span className="tabular-nums text-zinc-500 dark:text-zinc-300">{outcome.die}</span>
                <span className={`text-base font-bold ${SYMBOL_CLASSES[symbol]}`}>{symbol}</span>
            </span>
        </div>
    );
}
