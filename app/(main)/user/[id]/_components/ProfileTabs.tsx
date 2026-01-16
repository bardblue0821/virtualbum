"use client";
import React from 'react';

export type TabType = 'own' | 'joined' | 'comments' | 'images' | 'likes';

interface TabConfig {
  key: TabType;
  label: string;
  count: number;
  isPrivate?: boolean; // 自分のみ閲覧可能
}

interface ProfileTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  tabs: TabConfig[];
  isMe: boolean;
}

/**
 * プロフィールページのタブナビゲーション
 */
export default function ProfileTabs({
  activeTab,
  onTabChange,
  tabs,
  isMe,
}: ProfileTabsProps) {
  return (
    <div role="tablist" aria-label="コンテンツ切替" className="flex gap-2 flex-wrap">
      {tabs.map((tab) => {
        // 非公開タブは自分のみ表示
        if (tab.isPrivate && !isMe) return null;

        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`${
              isActive
                ? 'border-b-2 border-[--accent] text-foreground'
                : 'text-foreground/70 hover:bg-surface-weak'
            } px-3 py-2 transition-colors`}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
            <span className="text-xs text-muted ml-1">({tab.count})</span>
          </button>
        );
      })}
    </div>
  );
}
