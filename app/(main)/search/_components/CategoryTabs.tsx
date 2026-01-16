"use client";
import React from "react";
import { type SearchCategory } from "../_lib/hooks";

interface CategoryTabsProps {
  category: SearchCategory;
  onCategoryChange: (category: SearchCategory) => void;
}

const categories: { key: SearchCategory; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'users', label: 'ユーザー' },
  { key: 'albums', label: 'アルバム' },
  { key: 'userTags', label: 'ユーザータグ' },
  { key: 'albumTags', label: 'アルバムタグ' },
];

export function CategoryTabs({ category, onCategoryChange }: CategoryTabsProps) {
  return (
    <div className="mt-3 flex gap-2 flex-wrap">
      {categories.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onCategoryChange(key)}
          className={`px-3 py-1 rounded-full text-xs transition-colors ${
            category === key
              ? 'bg-[var(--accent)] text-white'
              : 'bg-muted/10 text-foreground hover:bg-muted/20'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
