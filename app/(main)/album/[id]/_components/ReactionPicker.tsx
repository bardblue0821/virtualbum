import React from "react";

export interface ReactionCategory { key: string; label: string; icon: React.ReactNode; }

export interface ReactionPickerProps {
  open: boolean;
  query: string;
  onQueryChange: (v: string) => void;
  activeCat: string;
  onCatChange: (key: string) => void;
  filteredEmojis: string[];
  categoryEmojis: string[];
  reactions: { emoji: string; count: number; mine: boolean }[];
  categories: ReactionCategory[];
  onPickEmoji: (emoji: string) => void;
  onClose: () => void;
}

export default function ReactionPicker(props: ReactionPickerProps) {
  const { open, query, onQueryChange, activeCat, onCatChange, filteredEmojis, categoryEmojis, reactions, categories, onPickEmoji, onClose } = props;
  if (!open) return null;
  return (
    <div className="absolute top-full left-0 mt-2 w-80 bg-background border border-line rounded shadow-lg p-2 z-50">
      <input
        autoFocus
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="検索（例: ハート / fire / 👍 を貼付）"
        className="mb-2 w-full border-b-2 bg-transparent p-1 text-sm focus:outline-none"
        style={{ borderColor: "var(--accent)" }}
      />
      {!query && (
        <div className="mb-2 flex flex-wrap gap-1">
          {categories.map(cat => {
            const isActive = activeCat === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                aria-label={cat.label}
                title={cat.label}
                onClick={() => onCatChange(cat.key)}
                className="flex items-center justify-center w-9 h-9 text-lg rounded border"
                style={isActive ? { backgroundColor: "var(--accent)", color: "var(--accent-fg)", borderColor: "var(--accent)" } : { borderColor: "var(--border)" }}
              >{cat.icon}</button>
            );
          })}
        </div>
      )}
      <div className="max-h-64 overflow-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        <div className="grid grid-cols-6 gap-2">
          {(query ? filteredEmojis : categoryEmojis).map((e) => {
            const rec = reactions.find((x) => x.emoji === e);
            const mine = !!rec?.mine;
            return (
              <button
                key={e}
                type="button"
                aria-label={`リアクション ${e}`}
                aria-pressed={mine}
                onClick={() => { onPickEmoji(e); onClose(); }}
                className="rounded border px-2 py-1 text-sm"
                style={mine ? { borderColor: "var(--accent)", backgroundColor: "var(--accent)", color: "var(--accent-fg)" } : { borderColor: "var(--border)" }}
              >{e}</button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
