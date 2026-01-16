import AlbumImageCropper from '@/components/features/upload/AlbumImageCropper';

interface ImageCropModalProps {
  isOpen: boolean;
  cropSrc: string | null;
  cropping: boolean;
  onClose: () => void;
  onConfirm: (
    area: { x: number; y: number; width: number; height: number },
    zoom: number,
    aspect: 'square' | 'rect'
  ) => void;
}

export default function ImageCropModal({
  isOpen,
  cropSrc,
  cropping,
  onClose,
  onConfirm,
}: ImageCropModalProps) {
  if (!isOpen || !cropSrc) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="surface-alt border border-line rounded shadow-lg w-[min(96vw,720px)] p-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-muted hover:bg-surface-weak rounded cursor-pointer disabled:cursor-not-allowed"
          onClick={onClose}
          aria-label="閉じる"
          disabled={cropping}
        >
          ✕
        </button>
        <h2 className="text-sm font-semibold mb-3">画像を切り抜く</h2>
        <AlbumImageCropper
          src={cropSrc}
          onCancel={onClose}
          onConfirm={onConfirm}
        />
        {cropping && <p className="text-xs text-muted mt-2">切り抜き中...</p>}
      </div>
    </div>
  );
}
