"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { translateError } from "@/lib/errors";
import { isRateLimitError } from "@/lib/rateLimit";
import { toggleReaction, listReactorsByAlbumEmoji, Reactor } from "@/lib/repos/reactionRepo";
import { addNotification } from "@/lib/repos/notificationRepo";
import { REACTION_CATEGORIES, filterReactionEmojis, ReactionCategoryKey } from "@/lib/constants/reactions";
import type { ReactionItem, AlbumRecord } from "./useAlbumData";

export interface UseReactionsResult {
  reactions: ReactionItem[];
  setReactions: React.Dispatch<React.SetStateAction<ReactionItem[]>>;
  pickerOpen: boolean;
  setPickerOpen: (open: boolean) => void;
  emojiQuery: string;
  setEmojiQuery: (query: string) => void;
  activeCat: ReactionCategoryKey;
  setActiveCat: React.Dispatch<React.SetStateAction<ReactionCategoryKey>>;
  filteredEmojis: string[];
  categoryEmojis: string[];
  hoveredEmoji: string | null;
  reactorMap: Record<string, Reactor[] | undefined>;
  reactorLoading: Record<string, boolean>;
  pickerRef: React.RefObject<HTMLDivElement | null>;
  pickerBtnRef: React.RefObject<HTMLButtonElement | null>;
  handleToggleReaction: (emoji: string) => Promise<void>;
  onChipEnter: (emoji: string) => void;
  onChipLeave: () => void;
}

export function useReactions(
  albumId: string | undefined,
  userId: string | undefined,
  album: AlbumRecord | null,
  reactions: ReactionItem[],
  setReactions: React.Dispatch<React.SetStateAction<ReactionItem[]>>,
  setError: (error: string | null) => void,
  toast: { error: (msg: string) => void }
): UseReactionsResult {
  const [pickerState, setPickerState] = useState<{ open: boolean; query: string }>({ open: false, query: "" });
  const [activeCat, setActiveCat] = useState<ReactionCategoryKey>(REACTION_CATEGORIES[0]?.key || 'faces');
  const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null);
  const [reactorMap, setReactorMap] = useState<Record<string, Reactor[] | undefined>>({});
  const [reactorLoading, setReactorLoading] = useState<Record<string, boolean>>({});
  
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const pickerBtnRef = useRef<HTMLButtonElement | null>(null);

  const filteredEmojis = useMemo(() => filterReactionEmojis(pickerState.query), [pickerState.query]);
  const categoryEmojis = useMemo(() => {
    const cat = REACTION_CATEGORIES.find(c => c.key === activeCat);
    return cat ? cat.emojis : [];
  }, [activeCat]);

  // ピッカー外クリック/ESC/状態変更時の処理
  useEffect(() => {
    if (!pickerState.open) return;
    
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (pickerRef.current && !pickerRef.current.contains(t) && 
          pickerBtnRef.current && !pickerBtnRef.current.contains(t)) {
        setPickerState({ open: false, query: "" });
      }
    }
    
    function onKey(e: KeyboardEvent) { 
      if (e.key === 'Escape') setPickerState({ open: false, query: "" }); 
    }
    
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKey);
    
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [pickerState.open]);

  const handleToggleReaction = useCallback(async (emoji: string) => {
    if (!userId || !albumId) return;
    
    const prev = reactions.slice();
    
    // 楽観更新
    setReactions((cur) => {
      const idx = cur.findIndex((x) => x.emoji === emoji);
      if (idx >= 0) {
        const item = { ...cur[idx] };
        if (item.mine) { 
          item.mine = false; 
          item.count = Math.max(0, item.count - 1); 
        } else { 
          item.mine = true; 
          item.count += 1; 
        }
        const next = cur.slice(); 
        next[idx] = item; 
        return next;
      } else {
        return [...cur, { emoji, count: 1, mine: true }];
      }
    });
    
    try {
      const token = await (window as any).__getIdToken?.();
      let added = false;
      
      if (token) {
        const res = await fetch('/api/reactions/toggle', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'authorization': `Bearer ${token}` },
          body: JSON.stringify({ albumId, userId, emoji }),
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          added = !!data?.added;
        } else {
          const result = await toggleReaction(albumId, userId, emoji);
          added = !!(result as any)?.added;
        }
      } else {
        const result = await toggleReaction(albumId, userId, emoji);
        added = !!(result as any)?.added;
      }
      
      if (added && album && album.ownerId !== userId) {
        // 通知作成（失敗しても UI には影響させない）
        addNotification({
          userId: album.ownerId,
          actorId: userId,
          type: 'reaction',
          albumId,
          message: 'アルバムにリアクション: ' + emoji,
        }).catch(() => {});
      }
    } catch (e: any) {
      // ロールバック
      setReactions(prev);
      if (isRateLimitError(e)) {
        toast.error(e.message);
      } else {
        setError(translateError(e));
      }
    }
  }, [albumId, userId, album, reactions, setReactions, setError, toast]);

  const onChipEnter = useCallback((emoji: string) => {
    if (!albumId) return;
    setHoveredEmoji(emoji);
    if (!reactorMap[emoji] && !reactorLoading[emoji]) {
      setReactorLoading((s) => ({ ...s, [emoji]: true }));
      listReactorsByAlbumEmoji(albumId, emoji, 20)
        .then((list) => setReactorMap((m) => ({ ...m, [emoji]: list })))
        .catch(() => {})
        .finally(() => setReactorLoading((s) => ({ ...s, [emoji]: false })));
    }
  }, [albumId, reactorMap, reactorLoading]);

  const onChipLeave = useCallback(() => {
    setHoveredEmoji(null);
  }, []);

  return {
    reactions,
    setReactions,
    pickerOpen: pickerState.open,
    setPickerOpen: (open: boolean) => setPickerState({ open, query: open ? "" : pickerState.query }),
    emojiQuery: pickerState.query,
    setEmojiQuery: (query: string) => setPickerState({ ...pickerState, query }),
    activeCat,
    setActiveCat,
    filteredEmojis,
    categoryEmojis,
    hoveredEmoji,
    reactorMap,
    reactorLoading,
    pickerRef,
    pickerBtnRef,
    handleToggleReaction,
    onChipEnter,
    onChipLeave,
  };
}
