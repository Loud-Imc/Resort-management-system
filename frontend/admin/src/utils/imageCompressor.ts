export async function compressImageClientSide(
    file: File, 
    maxWidth = 1920, 
    maxHeight = 1920, 
    quality = 0.82
): Promise<File> {
    if (!file.type.startsWith('image/') || file.type.includes('svg')) {
        return file;
    }
    return new Promise((resolve) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target?.result as string;
        };
        img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width > maxWidth || height > maxHeight) {
                if (width / height > maxWidth / maxHeight) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                } else {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return resolve(file);
            }
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
                (blob) => {
                    if (!blob) return resolve(file);
                    const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });
                    resolve(compressedFile.size < file.size ? compressedFile : file);
                },
                'image/jpeg',
                quality
            );
        };
        img.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
}
