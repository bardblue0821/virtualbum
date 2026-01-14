"use client";
import React from "react";
import type { FilterType } from "../_lib/hooks/useTimelineFilters";

interface TimelineFiltersProps {
  filter: FilterType;
  tagFilter: string;
  showFilterPopover: boolean;
  setShowFilterPopover: (show: boolean) => void;
  filterPopoverRef: React.RefObject<HTMLDivElement | null>;
  activeFilterCount: number;
  handleFilterChange: (newFilter: FilterType) => void;
  handleTagFilterChange: (newTag: string) => void;
}

export function TimelineFilters({
  filter,
  tagFilter,
  showFilterPopover,
  setShowFilterPopover,
  filterPopoverRef,
  activeFilterCount,
  handleFilterChange,
  handleTagFilterChange,
}: TimelineFiltersProps) {
  return (
    <div className="relative" ref={filterPopoverRef}>
      <button
        type="button"
        onClick={() => setShowFilterPopover(!showFilterPopover)}
        className={`p-2 rounded-md transition-colors ${
          showFilterPopover || activeFilterCount > 0
            ? "bg-[var(--accent)]/10 text-[var(--accent)]"
            : "hover:bg-muted/10 text-muted"
        }`}
        title="フィルター"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z"
          />
        </svg>
        {activeFilterCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] bg-[var(--accent)] text-white rounded-full flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Filter Popover */}
      {showFilterPopover && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-background border border-line rounded-lg shadow-lg p-4 space-y-4 z-20">
          {/* Friend/Watch filter */}
          <div>
            <span className="text-xs text-muted block mb-2">表示</span>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => handleFilterChange("all")}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  filter === "all"
                    ? "bg-[var(--accent)] text-white"
                    : "bg-muted/10 text-foreground hover:bg-muted/20"
                }`}
              >
                すべて
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange("friends")}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  filter === "friends"
                    ? "bg-[var(--accent)] text-white"
                    : "bg-muted/10 text-foreground hover:bg-muted/20"
                }`}
              >
                フレンド
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange("watched")}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  filter === "watched"
                    ? "bg-[var(--accent)] text-white"
                    : "bg-muted/10 text-foreground hover:bg-muted/20"
                }`}
              >
                ウォッチ
              </button>
            </div>
          </div>

          {/* Tag filter */}
          <div>
            <span className="text-xs text-muted block mb-2">タグで絞り込み</span>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={tagFilter}
                onChange={(e) => handleTagFilterChange(e.target.value)}
                placeholder="タグ名..."
                className="flex-1 px-3 py-1.5 text-sm border border-line rounded-md bg-background text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
              />
              {tagFilter && (
                <button
                  type="button"
                  onClick={() => handleTagFilterChange("")}
                  className="text-xs text-muted hover:text-foreground transition-colors"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Clear button */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => {
                handleFilterChange("all");
                handleTagFilterChange("");
              }}
              className="w-full text-sm text-muted hover:text-foreground py-1 transition-colors"
            >
              フィルターをクリア
            </button>
          )}
        </div>
      )}
    </div>
  );
}
