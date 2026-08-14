import { useState, useRef } from 'react';
import { Upload, X, Loader2, FileText } from 'lucide-react';
import { uploadService } from '../services/uploads';
import toast from 'react-hot-toast';

interface ImageUploadProps {
    images: string[];
    onChange: (images: string[]) => void;
    maxImages?: number;
    allowAllFiles?: boolean;
}

export default function ImageUpload({ 
    images = [], 
    onChange, 
    maxImages = 5,
    allowAllFiles = false 
}: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isImageFile = (url: string): boolean => {
        const cleanUrl = url.split('?')[0].toLowerCase();
        return cleanUrl.endsWith('.jpg') || 
               cleanUrl.endsWith('.jpeg') || 
               cleanUrl.endsWith('.png') || 
               cleanUrl.endsWith('.webp') || 
               cleanUrl.endsWith('.gif') || 
               cleanUrl.endsWith('.avif');
    };

    const handlePreviewClick = (url: string) => {
        window.open(url, '_blank');
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        try {
            const newImages = [...images];

            for (let i = 0; i < files.length; i++) {
                if (newImages.length >= maxImages) break;

                const file = files[i];
                // Validation
                if (!allowAllFiles) {
                    if (!file.type.startsWith('image/')) {
                        toast.error(`File ${file.name} is not an image`);
                        continue;
                    }
                } else {
                    const ext = file.name.split('.').pop()?.toLowerCase();
                    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'zip', 'rar'];
                    const isAllowedExt = ext ? allowedExts.includes(ext) : false;
                    
                    const allowedMimetypes = [
                        'image/',
                        'application/pdf',
                        'application/msword',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        'application/vnd.ms-excel',
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        'text/plain',
                        'application/zip',
                        'application/x-zip-compressed',
                        'application/x-rar-compressed'
                    ];
                    const isAllowedMime = allowedMimetypes.some(mime => file.type.startsWith(mime) || file.type === mime);

                    if (!isAllowedMime && !isAllowedExt) {
                        toast.error(`Unsupported file type: ${file.name}`);
                        continue;
                    }
                }

                const response: any = await uploadService.upload(file);
                newImages.push(response.url);
            }

            onChange(newImages);
        } catch (error) {
            console.error('Upload failed', error);
            toast.error('Failed to upload file. Please try again.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const removeImage = (index: number) => {
        const newImages = images.filter((_, i) => i !== index);
        onChange(newImages);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((url, index) => (
                    <div 
                        key={index} 
                        className="relative group aspect-video bg-muted rounded-lg overflow-hidden border border-border cursor-pointer hover:opacity-90 transition-all"
                        onClick={() => handlePreviewClick(url)}
                    >
                        {isImageFile(url) ? (
                            <img
                                src={url}
                                alt={`Uploaded ${index + 1}`}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-muted text-card-foreground">
                                <FileText className="h-8 w-8 text-primary mb-1" />
                                <span className="text-xs text-muted-foreground text-center truncate w-full px-1" title={url.split('/').pop()}>
                                    {url.split('/').pop() || `Document ${index + 1}`}
                                </span>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeImage(index);
                            }}
                            className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ))}

                {images.length < maxImages && (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {isUploading ? (
                            <Loader2 className="h-6 w-6 text-primary animate-spin" />
                        ) : (
                            <>
                                <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary mb-2 transition-colors" />
                                <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                                    {allowAllFiles ? 'Upload File' : 'Upload Image'}
                                </span>
                            </>
                        )}
                    </button>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept={allowAllFiles ? "image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar" : "image/*"}
                multiple
                className="hidden"
            />
            <p className="text-xs text-muted-foreground">
                {allowAllFiles 
                    ? `Supported formats: JPG, PNG, WEBP, PDF, DOC, DOCX, XLS, XLSX, TXT, ZIP. Max ${maxImages} files.`
                    : `Supported formats: JPG, PNG, WEBP. Max ${maxImages} images.`
                }
            </p>
        </div>
    );
}
