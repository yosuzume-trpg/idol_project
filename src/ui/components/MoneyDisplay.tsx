type MoneyDisplayProps = {
    value: number;
    className?: string;
};

export function MoneyDisplay({ value, className = "" }: MoneyDisplayProps) {
    return <span className={className}>{Math.floor(value).toLocaleString("ja-JP")}G</span>;
}
