"use client";

import { useEffect } from "react";

export type ToastVariant = "info" | "success" | "error";

type ToastProps = {
    message: string;
    variant?: ToastVariant;
    /** 自動で閉じるまでのミリ秒 */
    duration?: number;
    onClose: () => void;
};

const VARIANT_CLASSES: Record<ToastVariant, string> = {
    info: "bg-zinc-800 text-zinc-50",
    success: "bg-emerald-600 text-white",
    error: "bg-red-600 text-white",
};

export function Toast({ message, variant = "info", duration = 3000, onClose }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div
            role="status"
            className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md px-4 py-2 text-sm shadow-lg ${VARIANT_CLASSES[variant]}`}
        >
            {message}
        </div>
    );
}
