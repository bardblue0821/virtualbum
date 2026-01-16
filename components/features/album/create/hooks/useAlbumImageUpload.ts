import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';

const MAX_IMAGES = 4;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export function useAlbumImageUpload() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  const [croppedPreviews, setCroppedPreviews] = useState<({ file: File; url: string } | null)[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const previewsRef = useRef(previews);
  const croppedPreviewsRef = useRef(croppedPreviews);
  
  useEffect(() => { previewsRef.current = previews; }, [previews]);
  useEffect(() => { croppedPreviewsRef.current = croppedPreviews; }, [croppedPreviews]);

  // 選択クリア時に Object URL を開放
  useEffect(() => {
    return () => {
      previewsRef.current.forEach((p) => URL.revokeObjectURL(p.url));
      croppedPreviewsRef.current.forEach((p) => p && URL.revokeObjectURL(p.url));
    };
  }, []);

  function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const remaining = MAX_IMAGES - previews.length;
    if (remaining <= 0) {
      toast.error('これ以上追加できません（上限4枚）');
      return;
    }

    const accepted: { file: File; url: string }[] = [];
    for (let i = 0; i < Math.min(files.length, remaining); i++) {
      const file = files[i];
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: 画像ファイルのみ対応しています`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: サイズ上限 5MB を超えています`);
        continue;
      }
      accepted.push({ file, url: URL.createObjectURL(file) });
    }

    if (accepted.length > 0) {
      setPreviews((prev) => [...prev, ...accepted]);
      setCroppedPreviews((prev) => [...prev, ...new Array(accepted.length).fill(null)]);
      setFiles((prev) => [...prev, ...accepted.map((a) => a.file)]);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList) return;
    addFiles(fileList);
    e.target.value = '';
  }

  function handleDragOver(e: React.DragEvent, loading: boolean, user: any) {
    e.preventDefault();
    e.stopPropagation();
    if (!loading && user) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent, loading: boolean, user: any) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (loading || !user) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      addFiles(files);
    }
  }

  function handleEmptySlotClick(loading: boolean, user: any) {
    if (loading || !user || previews.length >= MAX_IMAGES) return;
    fileInputRef.current?.click();
  }

  function removeOne(target: File) {
    const idx = previews.findIndex((p) => p.file === target);
    const next = previews.filter((p) => p.file !== target);
    const removed = idx >= 0 ? previews[idx] : undefined;
    if (removed) URL.revokeObjectURL(removed.url);
    if (idx >= 0 && croppedPreviews[idx]) URL.revokeObjectURL(croppedPreviews[idx]!.url);
    setPreviews(next);
    setCroppedPreviews((prev) => prev.filter((_, i) => i !== idx));
    setFiles(next.map((p) => p.file));
  }

  function clearAll() {
    previews.forEach((p) => URL.revokeObjectURL(p.url));
    croppedPreviews.forEach((p) => p && URL.revokeObjectURL(p.url));
    setPreviews([]);
    setCroppedPreviews([]);
    setFiles([]);
  }

  function getUploadFiles() {
    return previews.map((p, idx) => croppedPreviews[idx]?.file ?? p.file);
  }

  return {
    fileInputRef,
    files,
    previews,
    croppedPreviews,
    isDragging,
    addFiles,
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleEmptySlotClick,
    removeOne,
    clearAll,
    getUploadFiles,
    setCroppedPreviews,
    MAX_IMAGES,
  };
}
