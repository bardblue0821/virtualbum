import React from 'react';
import Link from 'next/link';

interface TagListProps {
  tags: string[];
  /**
   * タグがクリック可能かどうか (default: true)
   */
  clickable?: boolean;
  /**
   * 追加のクラス名
   */
  className?: string;
}

/**
 * タグリストの共通コンポーネント
 * 
 * タグをクリックすると検索画面に遷移します。
 * プロフィール画面、タイムライン、アルバム詳細など、複数箇所で使用されます。
 */
export function TagList({ tags, clickable = true, className = '' }: TagListProps) {
  if (tags.length === 0) {
    return null;
  }

  const tagClasses = 'inline-block text-xs px-2 py-0.5 rounded-full bg-surface-weak border border-line hover:bg-surface';

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {tags.map((tag) => {
        const content = `#${tag}`;

        if (!clickable) {
          return (
            <span key={tag} className={tagClasses}>
              {content}
            </span>
          );
        }

        return (
          <Link
            key={tag}
            href={`/search?q=${encodeURIComponent(tag)}`}
            className={`${tagClasses} cursor-pointer`}
          >
            {content}
          </Link>
        );
      })}
    </div>
  );
}
