"use client";
import React from "react";

interface SearchHistoryProps {
  history: string[];
  onSelect: (term: string) => void;
  onClear: () => void;
}

export function SearchHistory({ history, onSelect, onClear }: SearchHistoryProps) {
  if (history.length === 0) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs fg-muted">最近の検索</p>
        <button type="button" onClick={onClear} className="text-[11px] fg-subtle">
          クリア
        </button>
      </div>
      <ul className="border border-base rounded divide-y divide-base">
        {history.map((h, i) => (
          <li key={i} className="text-sm">
            <button
              type="button"
              className="w-full text-left px-3 py-2 hover-surface-alt truncate"
              onClick={() => onSelect(h)}
            >
              {h}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
