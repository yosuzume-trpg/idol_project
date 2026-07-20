"use client";

import { useEffect, type ReactNode } from "react";

type ModalProps = {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    footer?: ReactNode;
};

export function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
            <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
                {title && <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>}
                <div className="text-zinc-700 dark:text-zinc-100">{children}</div>
                {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
            </div>
        </div>
    );
}
