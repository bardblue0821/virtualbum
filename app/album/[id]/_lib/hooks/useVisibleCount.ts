/*画像表示件数の管理フック*/

import { useState, useCallback } from 'react';
import { IMAGE_LIMITS } from '../constants/album.constants';

export function useVisibleCount(totalImages: number) {
  const [visibleCount, setVisibleCount] = useState(IMAGE_LIMITS.INITIAL_VISIBLE);

  const handleSeeMore = useCallback(() => {
    setVisibleCount((n) => Math.min(totalImages, n + IMAGE_LIMITS.LOAD_MORE_COUNT));
  }, [totalImages]);

  return { visibleCount, handleSeeMore };
}
