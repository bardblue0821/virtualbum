/**
 * 画像圧縮ユーティリティ
 * クライアント側で4K以上の画像を1920x1080に縮小し、WebP形式に変換する
 */

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  wasCompressed: boolean;
  width: number;
  height: number;
}

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputFormat?: 'webp' | 'jpeg';
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.85,
  outputFormat: 'webp',
};

/**
 * 画像が圧縮必要かどうかを判定する
 * - 解像度が maxWidth x maxHeight を超える場合
 * - ファイルサイズが 2MB を超える場合
 */
export async function needsCompression(
  file: File,
  options: CompressionOptions = {}
): Promise<{ needs: boolean; width: number; height: number }> {
  const { maxWidth, maxHeight } = { ...DEFAULT_OPTIONS, ...options };
  
  // サポートされている画像形式のみ
  if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/i)) {
    return { needs: false, width: 0, height: 0 };
  }

  // GIFは圧縮しない（アニメーション対応のため）
  if (file.type === 'image/gif') {
    return { needs: false, width: 0, height: 0 };
  }

  const dimensions = await getImageDimensions(file);
  
  // 解像度チェック
  const exceedsResolution = dimensions.width > maxWidth || dimensions.height > maxHeight;
  
  // ファイルサイズチェック（2MB以上）
  const exceedsSize = file.size > 2 * 1024 * 1024;
  
  return {
    needs: exceedsResolution || exceedsSize,
    width: dimensions.width,
    height: dimensions.height,
  };
}

/**
 * 画像の解像度を取得する
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

/**
 * 画像を圧縮する
 * @param file 元の画像ファイル
 * @param options 圧縮オプション
 * @param onProgress 進捗コールバック (0-100)
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {},
  onProgress?: (progress: number) => void
): Promise<CompressionResult> {
  const { maxWidth, maxHeight, quality, outputFormat } = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = file.size;

  // GIFは圧縮しない
  if (file.type === 'image/gif') {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
      width: 0,
      height: 0,
    };
  }

  onProgress?.(10);

  // 画像をロード
  const img = await loadImage(file);
  const originalWidth = img.naturalWidth;
  const originalHeight = img.naturalHeight;
  
  onProgress?.(30);

  // 新しいサイズを計算（アスペクト比を維持）
  let newWidth = originalWidth;
  let newHeight = originalHeight;
  
  if (originalWidth > maxWidth || originalHeight > maxHeight) {
    const widthRatio = maxWidth / originalWidth;
    const heightRatio = maxHeight / originalHeight;
    const ratio = Math.min(widthRatio, heightRatio);
    
    newWidth = Math.round(originalWidth * ratio);
    newHeight = Math.round(originalHeight * ratio);
  }

  onProgress?.(50);

  // Canvas で縮小・変換
  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // 高品質なリサイズのための設定
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // 画像を描画
  ctx.drawImage(img, 0, 0, newWidth, newHeight);
  
  onProgress?.(70);

  // Blob に変換
  const mimeType = outputFormat === 'webp' ? 'image/webp' : 'image/jpeg';
  const blob = await canvasToBlob(canvas, mimeType, quality);
  
  onProgress?.(90);

  // File オブジェクトを作成
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const extension = outputFormat === 'webp' ? '.webp' : '.jpg';
  const newFileName = baseName + extension;
  
  const compressedFile = new File([blob], newFileName, {
    type: mimeType,
    lastModified: Date.now(),
  });

  onProgress?.(100);

  return {
    file: compressedFile,
    originalSize,
    compressedSize: compressedFile.size,
    wasCompressed: true,
    width: newWidth,
    height: newHeight,
  };
}

/**
 * 複数の画像を圧縮する
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {},
  onFileProgress?: (index: number, progress: number) => void
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const checkResult = await needsCompression(file, options);
    
    if (checkResult.needs) {
      const result = await compressImage(file, options, (progress) => {
        onFileProgress?.(i, progress);
      });
      results.push(result);
    } else {
      // 圧縮不要の場合はそのまま返す
      results.push({
        file,
        originalSize: file.size,
        compressedSize: file.size,
        wasCompressed: false,
        width: checkResult.width,
        height: checkResult.height,
      });
      onFileProgress?.(i, 100);
    }
  }
  
  return results;
}

/**
 * 画像を Image オブジェクトとしてロード
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

/**
 * Canvas を Blob に変換
 */
function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      type,
      quality
    );
  });
}

/**
 * ファイルサイズを人間が読める形式にフォーマット
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
