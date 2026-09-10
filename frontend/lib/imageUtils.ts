const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

export type CompressedImage = {
  base64: string;
  contentType: string;
};

// Downscales large photos before they're embedded as base64 in the
// submission payload / stored in Postgres, keeping requests reasonably sized.
export async function compressImageToBase64(file: File): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  const base64 = dataUrl.split(',')[1] || '';
  return { base64, contentType: 'image/jpeg' };
}
