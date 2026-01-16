"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { validateTag, filterTagCandidates } from '@/lib/db/repositories/tag.repository';

export interface TagInputProps {
  /** 現在のタグリスト */
  tags: string[];
  /** タグ変更時のコールバック */
  onChange: (tags: string[]) => void;
  /** 最大タグ数 */
  maxTags?: number;
  /** プレースホルダー */
  placeholder?: string;
  /** 無効化 */
  disabled?: boolean;
  /** タグ候補（オートコンプリート用） */
  candidates?: string[];
  /** クラス名 */
  className?: string;
}

/**
 * タグ入力コンポーネント
 * - エンターでタグ化
 * - タグをクリックで編集
 * - Backspaceで最後のタグを削除
 * - オートコンプリート
 */
export default function TagInput({
  tags,
  onChange,
  maxTags = 5,
  placeholder = 'タグを入力...',
  disabled = false,
  candidates = [],
  className = '',
}: TagInputProps) {
  const [input, setInput] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showCandidates, setShowCandidates] = useState(false);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // フィルタリングされた候補
  const filteredCandidates = filterTagCandidates(
    candidates.filter((c) => !tags.includes(c)),
    input
  );

  // 外部クリックで候補を閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowCandidates(false);
        setEditingIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = useCallback(
    (tagText: string) => {
      const trimmed = tagText.trim();
      if (!trimmed) return false;

      const validation = validateTag(trimmed);
      if (!validation.valid) {
        return false;
      }

      if (tags.length >= maxTags) {
        return false;
      }

      if (tags.includes(trimmed)) {
        return false;
      }

      onChange([...tags, trimmed]);
      return true;
    },
    [tags, maxTags, onChange]
  );

  const removeTag = useCallback(
    (index: number) => {
      const newTags = tags.filter((_, i) => i !== index);
      onChange(newTags);
    },
    [tags, onChange]
  );

  const updateTag = useCallback(
    (index: number, newValue: string) => {
      const trimmed = newValue.trim();
      if (!trimmed) {
        removeTag(index);
        return;
      }

      const validation = validateTag(trimmed);
      if (!validation.valid) return;

      const newTags = [...tags];
      newTags[index] = trimmed;
      onChange(newTags);
    },
    [tags, onChange, removeTag]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    // 候補選択中
    if (showCandidates && filteredCandidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCandidateIndex((prev) =>
          prev < filteredCandidates.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCandidateIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCandidates.length - 1
        );
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (showCandidates && filteredCandidates.length > 0) {
        // 候補から選択
        const selected = filteredCandidates[selectedCandidateIndex];
        if (editingIndex !== null) {
          updateTag(editingIndex, selected);
          setEditingIndex(null);
        } else {
          addTag(selected);
        }
      } else {
        // 入力からタグ化
        if (editingIndex !== null) {
          updateTag(editingIndex, input);
          setEditingIndex(null);
        } else {
          if (addTag(input)) {
            setInput('');
          }
        }
      }
      setShowCandidates(false);
      return;
    }

    if (e.key === 'Escape') {
      setShowCandidates(false);
      setEditingIndex(null);
      setInput('');
      return;
    }

    if (e.key === 'Backspace' && !input && tags.length > 0 && editingIndex === null) {
      e.preventDefault();
      removeTag(tags.length - 1);
      return;
    }
  };

  const handleTagClick = (index: number) => {
    if (disabled) return;
    setEditingIndex(index);
    setInput(tags[index]);
    setShowCandidates(true);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    setShowCandidates(true);
    setSelectedCandidateIndex(0);
  };

  const handleCandidateClick = (candidate: string) => {
    if (editingIndex !== null) {
      updateTag(editingIndex, candidate);
      setEditingIndex(null);
    } else {
      addTag(candidate);
    }
    setInput('');
    setShowCandidates(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex flex-wrap gap-1 p-2 border border-line rounded-md bg-transparent focus-within:border-[--accent] transition-colors">
        {tags.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className={`
              inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm
              ${editingIndex === index
                ? 'bg-[--accent] text-white'
                : 'bg-surface-weak text-foreground cursor-pointer hover:bg-surface-alt'
              }
            `}
            onClick={() => handleTagClick(index)}
          >
            {editingIndex === index ? null : (
              <>
                #{tag}
                {!disabled && (
                  <button
                    type="button"
                    className="ml-1 w-4 h-4 rounded-full bg-foreground/20 text-foreground text-xs flex items-center justify-center hover:bg-red-500 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTag(index);
                    }}
                  >
                    ×
                  </button>
                )}
              </>
            )}
          </span>
        ))}
        {(tags.length < maxTags || editingIndex !== null) && (
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowCandidates(true)}
            placeholder={tags.length === 0 ? placeholder : ''}
            disabled={disabled}
            className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-sm placeholder:text-muted/50"
          />
        )}
      </div>

      {/* 候補リスト */}
      {showCandidates && filteredCandidates.length > 0 && !disabled && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 py-1 bg-background border border-line rounded-md shadow-lg max-h-40 overflow-auto">
          {filteredCandidates.map((candidate, index) => (
            <button
              key={candidate}
              type="button"
              className={`w-full px-3 py-1.5 text-left text-sm ${
                index === selectedCandidateIndex
                  ? 'bg-[--accent] text-white'
                  : 'hover:bg-surface-weak'
              }`}
              onClick={() => handleCandidateClick(candidate)}
            >
              #{candidate}
            </button>
          ))}
        </div>
      )}

      {/* タグ数表示 */}
      <div className="mt-1 text-xs text-muted/60 text-right">
        {tags.length} / {maxTags}
      </div>
    </div>
  );
}
