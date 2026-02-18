import { useState, useRef } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { uploadService } from '../services/uploads';
import toast from 'react-hot-toast';

interface ImageUploadProps {
    images: string[];
    onChange: (images: string[]) => void;
    maxImages?: number;
}

export default function ImageUpload({ images = [], onChange, maxImages = 5 }: ImageUploadProps) {
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

                const file = files[i];
                // Simple validation
                if (!file.type.startsWith('image/')) {
                    toast.error(`File ${file.name} is not an image`);
                    continue;
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
                    <div key={index} className="relative group aspect-video bg-muted rounded-lg overflow-hidden border border-border">
                        <img
                            src={url}
                            alt={`Uploaded ${index + 1}`}
                            className="w-full h-full object-cover"
                        />
                        <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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
                                <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">Upload Image</span>
                            </>
                        )}
                    </button>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                multiple
                className="hidden"
            />
            <p className="text-xs text-muted-foreground">
                Supported formats: JPG, PNG, WEBP. Max {maxImages} images.
            </p>
        </div>
    );
}
