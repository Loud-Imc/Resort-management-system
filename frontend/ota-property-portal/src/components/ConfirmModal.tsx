import React from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
    variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Delete',
    cancelText = 'Cancel',
    isLoading = false,
    variant = 'danger'
}: ConfirmModalProps) {
    if (!isOpen) return null;

    const getVariantStyles = () => {
        switch (variant) {
            case 'danger':
                return {
                    iconBg: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
                    buttonBg: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20',
                };
            case 'warning':
                return {
                    iconBg: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                    buttonBg: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20',
                };
            default:
                return {
                    iconBg: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                    buttonBg: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20',
                };
        }
    };

    const styles = getVariantStyles();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" 
                onClick={isLoading ? undefined : onClose} 
            />

            {/* Dialog Card */}
            <div className="relative bg-card border border-border text-card-foreground rounded-2xl shadow-2xl p-6 max-w-md w-full z-10 animate-in zoom-in-95 duration-200 space-y-4">
                <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 shadow-sm ${styles.iconBg}`}>
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="space-y-1.5 flex-1 pr-4">
                        <h3 className="font-extrabold text-base text-foreground">{title}</h3>
                        <div className="text-xs text-muted-foreground leading-relaxed font-medium">
                            {description}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2.5 rounded-xl border border-border bg-muted hover:bg-muted/80 text-foreground font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${styles.buttonBg}`}
                    >
                        {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        <span>{confirmText}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
