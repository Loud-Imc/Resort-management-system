import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, FileText, ExternalLink, RefreshCw } from 'lucide-react';
import { uploadService } from '../services/uploads';
import toast from 'react-hot-toast';

interface DocumentViewerUploadProps {
    label: string;
    description?: string;
    url?: string;
    onChange: (url: string) => void;
    aspectRatio?: 'aspect-[4/3]' | 'aspect-video' | 'aspect-[16/10]';
    allowAllFiles?: boolean;
}

export default function DocumentViewerUpload({
    label,
    description,
    url = '',
    onChange,
    aspectRatio = 'aspect-[4/3]',
    allowAllFiles = true,
}: DocumentViewerUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isImageFile = (fileUrl: string): boolean => {
        if (!fileUrl) return false;
        const cleanUrl = fileUrl.split('?')[0].toLowerCase();
        return (
            cleanUrl.endsWith('.jpg') ||
            cleanUrl.endsWith('.jpeg') ||
            cleanUrl.endsWith('.png') ||
            cleanUrl.endsWith('.webp') ||
            cleanUrl.endsWith('.gif') ||
            cleanUrl.endsWith('.avif')
        );
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        setIsUploading(true);
        try {
            if (!allowAllFiles && !file.type.startsWith('image/')) {
                toast.error(`File ${file.name} is not an image`);
                return;
            }

            const response: any = await uploadService.upload(file);
            onChange(response.url);
            toast.success('Document uploaded successfully');
        } catch (error) {
            console.error('Upload failed', error);
            toast.error('Failed to upload document. Please try again.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const fileName = url ? url.split('/').pop()?.split('?')[0] || 'Uploaded Document' : '';

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-bold text-card-foreground">
                    {label}
                </label>
                {url && (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            <RefreshCw className="h-3 w-3" />
                            Replace
                        </button>
                        <span className="text-muted-foreground">•</span>
                        <button
                            type="button"
                            onClick={() => onChange('')}
                            className="text-xs font-semibold text-destructive hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            <X className="h-3 w-3" />
                            Remove
                        </button>
                    </div>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={allowAllFiles ? '.jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt' : 'image/*'}
                onChange={handleFileChange}
                disabled={isUploading}
            />

            {url ? (
                <div className={`group relative ${aspectRatio} rounded-xl overflow-hidden border-2 border-border bg-muted/30 shadow-xs hover:border-primary/50 transition-all duration-300`}>
                    {isImageFile(url) ? (
                        <img
                            src={url}
                            alt={label}
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-card">
                            <FileText className="h-12 w-12 text-primary mb-2 stroke-[1.5]" />
                            <span className="text-sm font-bold text-card-foreground line-clamp-1 max-w-[80%]">
                                {fileName}
                            </span>
                            <span className="text-xs text-muted-foreground mt-1">PDF / Document File</span>
                        </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[1px]">
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-primary hover:bg-primary/90 px-3.5 py-2 rounded-lg shadow-lg transition-transform hover:scale-105"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View Full Document
                        </a>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className={`w-full ${aspectRatio} flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 rounded-xl transition-all group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
                >
                    {isUploading ? (
                        <>
                            <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                            <span className="text-xs font-bold text-primary">Uploading document...</span>
                        </>
                    ) : (
                        <>
                            <div className="p-3 bg-muted rounded-full group-hover:bg-primary/10 transition-colors mb-2">
                                <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <span className="text-sm font-bold text-card-foreground group-hover:text-primary transition-colors">
                                Upload {label}
                            </span>
                            <span className="text-xs text-muted-foreground mt-1">
                                Click to select image or document (JPG, PNG, PDF)
                            </span>
                        </>
                    )}
                </button>
            )}

            {description && (
                <p className="text-xs text-muted-foreground font-medium">
                    {description}
                </p>
            )}
        </div>
    );
}

export function MultiDocumentViewerUpload({
    label,
    description,
    documents = [],
    onChange,
    maxDocuments = 10,
}: {
    label: string;
    description?: string;
    documents: string[];
    onChange: (urls: string[]) => void;
    maxDocuments?: number;
}) {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isImageFile = (fileUrl: string): boolean => {
        if (!fileUrl) return false;
        const cleanUrl = fileUrl.split('?')[0].toLowerCase();
        return (
            cleanUrl.endsWith('.jpg') ||
            cleanUrl.endsWith('.jpeg') ||
            cleanUrl.endsWith('.png') ||
            cleanUrl.endsWith('.webp') ||
            cleanUrl.endsWith('.gif') ||
            cleanUrl.endsWith('.avif')
        );
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        try {
            const newDocs = [...documents];
            for (let i = 0; i < files.length; i++) {
                if (newDocs.length >= maxDocuments) break;
                const file = files[i];

                const response: any = await uploadService.upload(file);
                newDocs.push(response.url);
            }
            onChange(newDocs);
            toast.success('Document(s) uploaded successfully');
        } catch (error) {
            console.error('Upload failed', error);
            toast.error('Failed to upload document. Please try again.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const removeDoc = (index: number) => {
        onChange(documents.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-bold text-card-foreground">
                    {label} ({documents.length}/{maxDocuments})
                </label>
                {documents.length < maxDocuments && (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                        <Upload className="h-3.5 w-3.5" />
                        Add Document
                    </button>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                onChange={handleFileChange}
                disabled={isUploading}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {documents.map((docUrl, idx) => {
                    const docName = docUrl.split('/').pop()?.split('?')[0] || `Document ${idx + 1}`;
                    const isImg = isImageFile(docUrl);

                    return (
                        <div
                            key={idx}
                            className="group relative aspect-[4/3] rounded-xl overflow-hidden border-2 border-border bg-muted/30 hover:border-primary/50 transition-all shadow-xs"
                        >
                            {isImg ? (
                                <img
                                    src={docUrl}
                                    alt={`Document ${idx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-card">
                                    <FileText className="h-10 w-10 text-primary mb-2 stroke-[1.5]" />
                                    <span className="text-xs font-bold text-card-foreground line-clamp-2 px-2">
                                        {docName}
                                    </span>
                                </div>
                            )}

                            {/* Top right delete */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeDoc(idx);
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:scale-110 cursor-pointer"
                                title="Remove document"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>

                            {/* Hover overlay for full preview */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                                <a
                                    href={docUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-lg shadow-lg"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    View Document
                                </a>
                            </div>
                        </div>
                    );
                })}

                {documents.length < maxDocuments && (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="aspect-[4/3] flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 rounded-xl transition-all group disabled:opacity-50 disabled:cursor-not-allowed p-4 text-center cursor-pointer"
                    >
                        {isUploading ? (
                            <Loader2 className="h-6 w-6 text-primary animate-spin" />
                        ) : (
                            <>
                                <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary mb-2 transition-colors" />
                                <span className="text-xs font-bold text-muted-foreground group-hover:text-primary transition-colors">
                                    Upload Additional Document
                                </span>
                                <span className="text-[10px] text-muted-foreground mt-1">Image or PDF</span>
                            </>
                        )}
                    </button>
                )}
            </div>

            {description && (
                <p className="text-xs text-muted-foreground font-medium">
                    {description}
                </p>
            )}
        </div>
    );
}
