import { useState, useRef } from 'react';
import { Upload, X, Loader2, Star } from 'lucide-react';
import { uploadService } from '../services/uploads';
import toast from 'react-hot-toast';

interface ImageUploadProps {
    images: string[];
    onChange: (images: string[]) => void;
    maxImages?: number;
    allowAllFiles?: boolean;
    allowCoverSelect?: boolean;
}

export default function ImageUpload({ images = [], onChange, maxImages = 5, allowAllFiles = false, allowCoverSelect = false }: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        try {
            const newImages = [...images];
            for (let i = 0; i < files.length; i++) {
                if (newImages.length >= maxImages) break;
                const rawFile = files[i];
                if (!allowAllFiles && !rawFile.type.startsWith('image/')) {
                    toast.error(`File ${rawFile.name} is not an image`);
                    continue;
                }
                let file: File = rawFile;
                if (rawFile.type.startsWith('image/')) {
                    const { compressImageClientSide } = await import('../utils/imageCompressor');
                    file = await compressImageClientSide(rawFile, 1920, 1920, 0.82);
                }
                const response: any = await uploadService.upload(file);
                newImages.push(response.url);
            }
            onChange(newImages);
        } catch (error) {
            console.error('Upload failed', error);
            toast.error('Failed to upload image. Please try again.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeImage = (index: number) => {
        onChange(images.filter((_, i) => i !== index));
    };

    const setAsCover = (index: number) => {
        if (index === 0) return;
        const updated = [...images];
        const [selected] = updated.splice(index, 1);
        updated.unshift(selected);
        onChange(updated);
        toast.success('Cover image updated');
    };

    return (
        <div className="space-y-4">
            {allowCoverSelect && images.length > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    Click the star on any image to set it as the main cover photo.
                </p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((url, index) => (
                    <div key={index} className="relative group aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <img src={url} alt={`Uploaded ${index + 1}`} className="w-full h-full object-cover" />
                        {/* Cover badge for first image */}
                        {allowCoverSelect && index === 0 && (
                            <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow">
                                <Star className="h-3 w-3 fill-white" />
                                Cover
                            </div>
                        )}
                        {/* Set as cover button for non-first images */}
                        {allowCoverSelect && index > 0 && (
                            <button
                                type="button"
                                onClick={() => setAsCover(index)}
                                title="Set as main cover photo"
                                className="absolute top-2 left-2 p-1 bg-amber-400 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow"
                            >
                                <Star className="h-3.5 w-3.5" />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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
                        className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors disabled:opacity-50 group"
                    >
                        {isUploading ? (
                            <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                        ) : (
                            <>
                                <Upload className="h-6 w-6 text-gray-400 group-hover:text-blue-500 mb-2 transition-colors" />
                                <span className="text-sm text-gray-500 group-hover:text-blue-500 transition-colors">Upload Image</span>
                            </>
                        )}
                    </button>
                )}
            </div>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept={allowAllFiles ? '*/*' : 'image/*'}
                multiple
                className="hidden"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
                {allowAllFiles ? `Supported: images & documents. ` : 'Supported formats: JPG, PNG, WEBP. '}
                Max {maxImages} files.
            </p>
        </div>
    );
}

