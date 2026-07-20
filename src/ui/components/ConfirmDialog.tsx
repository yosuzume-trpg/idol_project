"use client";

import { Button } from "./Button";
import { Modal } from "./Modal";

type ConfirmDialogProps = {
    isOpen: boolean;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmLabel = "OK",
    cancelLabel = "キャンセル",
    danger = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onCancel}
            title={title}
            footer={
                <>
                    <Button variant="secondary" onClick={onCancel}>
                        {cancelLabel}
                    </Button>
                    <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
                        {confirmLabel}
                    </Button>
                </>
            }
        >
            <p>{message}</p>
        </Modal>
    );
}
