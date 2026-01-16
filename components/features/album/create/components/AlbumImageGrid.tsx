interface AlbumImageGridProps {
  previews: { file: File; url: string }[];
  croppedPreviews: ({ file: File; url: string } | null)[];
  isDragging: boolean;
  loading: boolean;
  disabled: boolean;
  maxImages: number;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onEmptySlotClick: () => void;
  onRemove: (file: File) => void;
  onClearAll: () => void;
  onOpenCrop: (idx: number) => void;
}

export default function AlbumImageGrid({
  previews,
  croppedPreviews,
  isDragging,
  loading,
  disabled,
  maxImages,
  fileInputRef,
  onFileSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  onEmptySlotClick,
  onRemove,
  onClearAll,
  onOpenCrop,
}: AlbumImageGridProps) {
  return (
    <div>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        multiple
        onChange={onFileSelect}
        className="hidden"
        disabled={loading || disabled}
      />
      
      {/* 田の字グリッド（2x2）- ドラッグ&ドロップ対応 */}
      <div
        className={`relative grid grid-cols-2 gap-3 p-2 rounded-lg transition-colors ${
          isDragging 
            ? 'border-2 border-dashed border-[var(--accent)] bg-[var(--accent)]/10' 
            : 'border-2 border-transparent'
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* ドラッグ中のオーバーレイ */}
        {isDragging && previews.length < maxImages && (
          <div className="col-span-2 absolute inset-0 flex items-center justify-center pointer-events-none z-20 rounded-lg bg-[var(--accent)]/20">
            <div className="bg-[var(--accent)] text-white px-4 py-2 rounded-lg font-medium shadow-lg">
              ここにドロップ
            </div>
          </div>
        )}
        
        {/* 選択済み画像 */}
        {previews.map((p, idx) => (
          <div
            key={p.url}
            className="relative aspect-square rounded-lg overflow-hidden border-2 border-line surface-alt"
          >
            {/* 削除ボタン */}
            <button
              type="button"
              aria-label={`${p.file.name} を削除`}
              className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-red-600 text-white text-lg leading-none flex items-center justify-center hover:bg-red-700 cursor-pointer disabled:opacity-50"
              onClick={(e) => { e.stopPropagation(); onRemove(p.file); }}
              disabled={loading}
            >
              ×
            </button>
            
            {/* 画像（クリックでクロップ） */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={croppedPreviews[idx]?.url ?? p.url}
              alt={p.file.name}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => onOpenCrop(idx)}
            />
            
            {/* クリックで切抜ラベル */}
            <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded">
              クリックで切抜
            </span>
          </div>
        ))}
        
        {/* 空きマス */}
        {Array.from({ length: maxImages - previews.length }).map((_, i) => (
          <button
            key={`empty-${i}`}
            type="button"
            onClick={onEmptySlotClick}
            disabled={loading || disabled}
            className="aspect-square rounded-lg border-2 border-dashed border-line flex flex-col items-center justify-center gap-2 hover:border-[var(--accent)] hover:bg-surface-weak transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        ))}
      </div>
      
      {previews.length > 0 && (
        <div className="mt-3 flex justify-between items-center">
          <p className="text-xs text-muted">選択中: {previews.length} / {maxImages}</p>
          <button
            type="button"
            onClick={onClearAll}
            disabled={loading}
            className="text-xs text-red-500 hover:text-red-600 cursor-pointer disabled:opacity-50"
          >
            すべて外す
          </button>
        </div>
      )}
    </div>
  );
}
