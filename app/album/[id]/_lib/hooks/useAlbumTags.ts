/**
 * アルバムタグの管理フック
 */

import { useState, useEffect } from 'react';
import { getAllAlbumTags, updateAlbumTags } from '@/lib/repos/tagRepo';

export function useAlbumTags(
  albumId: string | undefined,
  userId: string | undefined,
  setAlbum: React.Dispatch<React.SetStateAction<any>>
) {
  const [tagCandidates, setTagCandidates] = useState<string[]>([]);

  useEffect(() => {
    getAllAlbumTags(100)
      .then(setTagCandidates)
      .catch(() => {});
  }, []);

  const handleTagsChange = async (newTags: string[]) => {
    if (!albumId || !userId) return;
    await updateAlbumTags(albumId, newTags, userId);
    setAlbum((prev: any) => (prev ? { ...prev, tags: newTags } : prev));
  };

  return { tagCandidates, handleTagsChange };
}
