const compressibleImageTypes = new Set(["image/jpeg", "image/png"]);

export type ImageCompressionOptions = {
  maxDimension: number;
  quality?: number;
};

export function scaledImageDimensions(width: number, height: number, maxDimension: number) {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function compressedImageName(name: string) {
  const baseName = name.replace(/\.[^.]+$/, "") || "image";
  return `${baseName}.jpg`;
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error("The browser could not compress this image."));
    }, "image/jpeg", quality);
  });
}

export async function compressImageForUpload(file: File, { maxDimension, quality = 0.82 }: ImageCompressionOptions) {
  if (!compressibleImageTypes.has(file.type)) return file;

  const bitmap = await createImageBitmap(file);
  try {
    const dimensions = scaledImageDimensions(bitmap.width, bitmap.height, maxDimension);
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("The browser could not prepare this image.");

    // JPEG has no transparency, so use a white background for transparent PNGs.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await canvasToJpeg(canvas, quality);
    if (blob.size >= file.size) return file;

    return new File([blob], compressedImageName(file.name), {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close();
  }
}
