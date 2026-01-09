"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import type { ReactionData } from "./types";
import { REACTION_CATEGORIES, filterReactionEmojis } from "@/lib/constants/reactions";
import { listReactorsByAlbumEmoji, Reactor } from "@/lib/repos/reactionRepo";
import { getOptimizedImageUrl } from "@/lib/utils/imageUrl";

interface ReactionSectionProps {
  albumId: string;
  reactions: ReactionData[];
  onToggleReaction?: (emoji: string) => void;
  /** 表示するリアクションの上限数（デフォルト: 30） */
  maxReactions?: number;
}

// カテゴリキー型
type CategoryKey = typeof REACTION_CATEGORIES[number]['key'];

/**
 * リアクションチップとピッカー
 */
export function ReactionSection({ albumId, reactions, onToggleReaction, maxReactions = 30 }: ReactionSectionProps) {
  const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null);
  const [reactorMap, setReactorMap] = useState<Record<string, Reactor[] | undefined>>({});
  const [reactorLoading, setReactorLoading] = useState<Record<string, boolean>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [emojiQuery, setEmojiQuery] = useState("");
  const [activeCat, setActiveCat] = useState<CategoryKey>(REACTION_CATEGORIES[0]?.key || 'faces');
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const pickerBtnRef = useRef<HTMLButtonElement | null>(null);

  const filteredEmojis = useMemo(() => filterReactionEmojis(emojiQuery), [emojiQuery]);
  const categoryEmojis = useMemo(() => {
    const cat = REACTION_CATEGORIES.find(c => c.key === activeCat);
    return cat ? cat.emojis : [];
  }, [activeCat]);

  async function refreshReactorList(emoji: string) {
    if (reactorLoading[emoji]) return;
    setReactorLoading((s) => ({ ...s, [emoji]: true }));
    try {
      const list = await listReactorsByAlbumEmoji(albumId, emoji, 20);
      setReactorMap((m) => ({ ...m, [emoji]: list }));
    } finally {
      setReactorLoading((s) => ({ ...s, [emoji]: false }));
    }
  }

  function onChipEnter(emoji: string) {
    setHoveredEmoji(emoji);
    if (!reactorMap[emoji]) {
      refreshReactorList(emoji);
    }
  }

  function onChipLeave() { 
    setHoveredEmoji(null); 
  }

  // ピッカー外クリック/ESCで閉じる
  useEffect(() => {
    if (!pickerOpen) return;
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (pickerRef.current && !pickerRef.current.contains(t) && 
          pickerBtnRef.current && !pickerBtnRef.current.contains(t)) {
        setPickerOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) { 
      if (e.key === 'Escape') setPickerOpen(false); 
    }
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [pickerOpen]);

  // 開くたびに検索語をクリア
  useEffect(() => { 
    if (pickerOpen) setEmojiQuery(""); 
  }, [pickerOpen]);

  // リアクション状態が変わったら、ホバー中の絵文字のリストをリフレッシュ
  useEffect(() => {
    if (hoveredEmoji) {
      refreshReactorList(hoveredEmoji);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reactions]);

  // 表示するリアクションを上限数で制限
  const displayReactions = useMemo(() => {
    const filtered = reactions.filter(r => r.count > 0);
    return filtered.slice(0, maxReactions);
  }, [reactions, maxReactions]);

  const hasMoreReactions = reactions.filter(r => r.count > 0).length > maxReactions;

  return (
    <div className="flex items-center gap-2 flex-wrap relative">
      {/* 既存リアクションチップ */}
      {displayReactions.length > 0 && (
        <>
          {displayReactions.map((r) => (
            <ReactionChip
              key={r.emoji}
              emoji={r.emoji}
              count={r.count}
              mine={r.mine}
              onToggle={() => {
                onToggleReaction?.(r.emoji);
                if (hoveredEmoji === r.emoji) {
                  refreshReactorList(r.emoji);
                }
              }}
              onMouseEnter={() => onChipEnter(r.emoji)}
              onMouseLeave={onChipLeave}
              hovered={hoveredEmoji === r.emoji}
              reactors={reactorMap[r.emoji]}
              loading={reactorLoading[r.emoji]}
            />
          ))}
          {hasMoreReactions && (
            <span className="text-xs text-muted px-1">+{reactions.filter(r => r.count > 0).length - maxReactions}</span>
          )}
        </>
      )}

      {/* 追加用ピッカー */}
      <button
        ref={pickerBtnRef}
        type="button"
        aria-label="リアクションを追加"
        disabled={!onToggleReaction}
        onClick={() => setPickerOpen((o) => !o)}
        className="px-1 text-lg leading-none text-muted disabled:opacity-50"
      >＋</button>

      {pickerOpen && (
        <EmojiPicker
          ref={pickerRef}
          reactions={reactions}
          emojiQuery={emojiQuery}
          onQueryChange={setEmojiQuery}
          activeCat={activeCat}
          onCatChange={setActiveCat}
          filteredEmojis={filteredEmojis}
          categoryEmojis={categoryEmojis}
          onSelect={(emoji) => {
            onToggleReaction?.(emoji);
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}

// リアクションチップ
interface ReactionChipProps {
  emoji: string;
  count: number;
  mine: boolean;
  onToggle: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  hovered: boolean;
  reactors?: Reactor[];
  loading?: boolean;
}

function ReactionChip({ 
  emoji, 
  count, 
  mine, 
  onToggle, 
  onMouseEnter, 
  onMouseLeave, 
  hovered,
  reactors,
  loading 
}: ReactionChipProps) {
  return (
    <div 
      className="relative" 
      onMouseEnter={onMouseEnter} 
      onMouseLeave={onMouseLeave}
    >
      <button
        type="button"
        aria-label={`リアクション ${emoji}`}
        aria-pressed={mine}
        onClick={onToggle}
        className="rounded border px-2 py-1 text-sm bg-background"
        style={mine ? { borderColor: "var(--accent)", color: "var(--accent)" } : { borderColor: "var(--border)", color: "var(--muted)" }}
      >
        {emoji} <span className="text-xs">{count}</span>
      </button>

      {hovered && (
        <div className="absolute left-0 top-full mt-1 w-64 rounded border border-line bg-background shadow-lg z-40">
          <div className="p-2">
            <p className="text-[11px] text-muted/80 mb-1">このリアクションをした人</p>
            {loading && <p className="text-xs text-muted/80">読み込み中...</p>}
            {!loading && (
              (reactors && reactors.length > 0) ? (
                <ul className="max-h-64 overflow-auto divide-y divide-line">
                  {reactors.map((u) => (
                    <ReactorRow key={u.uid} user={u} />
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted/80">まだいません</p>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ReactorRow({ user }: { user: Reactor }) {
  const name = user.displayName || '名前未設定';
  return (
    <li>
      <a 
        href={`/user/${user.handle || user.uid}`} 
        className="flex items-center gap-2 px-2 py-1 hover:bg-surface-weak"
      >
        {user.iconURL ? (
          <div className="relative h-5 w-5 rounded-full overflow-hidden flex-shrink-0">
            <Image 
              src={user.iconURL.startsWith('data:') ? user.iconURL : getOptimizedImageUrl(user.iconURL, 'thumb')} 
              alt="" 
              fill
              sizes="20px"
              className="object-cover"
              unoptimized={user.iconURL.startsWith('data:')}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src !== user.iconURL) {
                  target.src = user.iconURL || '';
                }
              }}
            />
          </div>
        ) : (
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface-weak text-[10px] text-muted">
            {name[0] || '?'}
          </span>
        )}
        <span className="text-sm font-medium">{name}</span>
        {user.handle && <span className="text-[11px] text-muted/80">@{user.handle}</span>}
      </a>
    </li>
  );
}

// 絵文字ピッカー
interface EmojiPickerProps {
  reactions: ReactionData[];
  emojiQuery: string;
  onQueryChange: (q: string) => void;
  activeCat: string;
  onCatChange: (cat: CategoryKey) => void;
  filteredEmojis: string[];
  categoryEmojis: string[];
  onSelect: (emoji: string) => void;
}

const EmojiPicker = React.forwardRef<HTMLDivElement, EmojiPickerProps>(
  function EmojiPicker(
    { reactions, emojiQuery, onQueryChange, activeCat, onCatChange, filteredEmojis, categoryEmojis, onSelect },
    ref
  ) {
    return (
      <div 
        ref={ref} 
        className="absolute top-full left-0 mt-2 w-80 bg-background border border-line rounded shadow-lg p-2 z-50"
      >
        <input
          autoFocus
          value={emojiQuery}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="検索（例: ハート / fire / 👍 を貼付）"
          className="mb-2 w-full border-b-2 bg-transparent p-1 text-sm focus:outline-none"
          style={{ borderColor: "var(--accent)" }}
        />

        {/* カテゴリタブ（検索時は非表示） */}
        {!emojiQuery && (
          <div className="mb-2 flex flex-wrap gap-1">
            {REACTION_CATEGORIES.map(cat => {
              const isActive = activeCat === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  aria-label={cat.label}
                  title={cat.label}
                  onClick={() => onCatChange(cat.key)}
                  className="flex items-center justify-center w-8 h-8 text-lg rounded border bg-background text-muted"
                  style={isActive ? { backgroundColor: "var(--accent)", color: "var(--accent-fg)", borderColor: "var(--accent)" } : { borderColor: "var(--border)" }}
                >
                  {cat.icon}
                </button>
              );
            })}
          </div>
        )}

        <div className="max-h-64 overflow-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          <div className="grid grid-cols-6 gap-2">
            {(emojiQuery ? filteredEmojis : categoryEmojis).map((e) => {
              const rec = reactions.find((x) => x.emoji === e);
              const mine = !!rec?.mine;
              return (
                <button
                  key={e}
                  type="button"
                  aria-label={`リアクション ${e}`}
                  aria-pressed={mine}
                  onClick={() => onSelect(e)}
                  className="rounded border px-2 py-1 text-sm bg-background text-muted"
                  style={mine ? { borderColor: "var(--accent)", backgroundColor: "var(--accent)", color: "var(--accent-fg)" } : { borderColor: "var(--border)" }}
                >
                  {e}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
);
