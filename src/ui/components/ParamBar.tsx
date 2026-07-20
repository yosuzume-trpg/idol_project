type ParamBarProps = {
    label: string;
    value: number;
    max?: number;
    className?: string;
};

// 武道館期の実効値目安（§3.2）をバー満タンの目安として使う。上限そのものではない
const DEFAULT_MAX = 1500;

export function ParamBar({ label, value, max = DEFAULT_MAX, className = "" }: ParamBarProps) {
    const displayValue = Math.floor(value);
    const ratio = Math.min(1, Math.max(0, value / max));

    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-100">
                <span>{label}</span>
                <span className="tabular-nums">{displayValue}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                    className="h-full rounded-full bg-indigo-500 transition-[width] dark:bg-indigo-400"
                    style={{ width: `${ratio * 100}%` }}
                />
            </div>
        </div>
    );
}
