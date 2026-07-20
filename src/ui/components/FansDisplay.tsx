type FansDisplayProps = {
    value: number;
    className?: string;
};

export function FansDisplay({ value, className = "" }: FansDisplayProps) {
    return <span className={className}>{Math.floor(value).toLocaleString("ja-JP")}人</span>;
}
