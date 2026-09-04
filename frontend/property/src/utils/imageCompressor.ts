/**
 * Client-side image compression utility using HTML5 Canvas
 */
export async function compressImageClientSide(
    file: File,
    maxWidth: number = 1600,
    maxHeight: number = 1600,
    quality: number = 0.8
): Promise<File> {
    // If not an image (e.g. PDF), return original file directly
    if (!file.type.startsWith('image/')) {
        return file;
    }

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;

            img.onload = () => {
                let { width, height } = img;

                // Scale down if image exceeds max bounds
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(file); // Fallback to original file
                    return;
                }

                // Smooth resizing
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);

                const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            resolve(file); // Fallback
                            return;
                        }

                        // Create a new File from the blob
                        const compressedFile = new File([blob], file.name, {
                            type: outputType,
                            lastModified: Date.now(),
                        });

                        // If compressed is somehow larger than original, keep original
                        if (compressedFile.size > file.size) {
                            resolve(file);
                        } else {
                            resolve(compressedFile);
                        }
                    },
                    outputType,
                    quality
                );
            };

            img.onerror = () => {
                resolve(file); // Fallback
            };
        };

        reader.onerror = () => {
            resolve(file); // Fallback
        };
    });
}
