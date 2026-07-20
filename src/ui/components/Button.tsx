"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    fullWidth?: boolean;
    children: ReactNode;
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
    primary:
        "bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-indigo-600/40 dark:bg-indigo-500 dark:hover:bg-indigo-400",
    secondary:
        "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 disabled:bg-zinc-100/60 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
    danger: "bg-red-600 text-white hover:bg-red-500 disabled:bg-red-600/40 dark:bg-red-500 dark:hover:bg-red-400",
};

export function Button({
    variant = "primary",
    fullWidth = false,
    className = "",
    disabled,
    children,
    ...rest
}: ButtonProps) {
    return (
        <button
            type="button"
            disabled={disabled}
            className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
            {...rest}
        >
            {children}
        </button>
    );
}
