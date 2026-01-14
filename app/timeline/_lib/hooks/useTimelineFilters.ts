"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { User } from "firebase/auth";
import type { TimelineItemVM } from "@/src/models/timeline";

export type FilterType = "all" | "friends" | "watched";

const FILTER_STORAGE_KEY = "virtualbum:timeline:filter";
const TAG_FILTER_STORAGE_KEY = "virtualbum:timeline:tagFilter";

interface UseTimelineFiltersProps {
  rows: TimelineItemVM[];
  user: User | null | undefined;
  friendSet: Set<string>;
  watchSet: Set<string>;
}

interface UseTimelineFiltersReturn {
  filter: FilterType;
  setFilter: (f: FilterType) => void;
  tagFilter: string;
  setTagFilter: (tag: string) => void;
  showFilterPopover: boolean;
  setShowFilterPopover: (show: boolean) => void;
  filterPopoverRef: React.RefObject<HTMLDivElement | null>;
  filteredRows: TimelineItemVM[];
  activeFilterCount: number;
  handleFilterChange: (newFilter: FilterType) => void;
  handleTagFilterChange: (newTag: string) => void;
}

/**
 * タイムラインのフィルター機能を管理
 */
export function useTimelineFilters({
  rows,
  user,
  friendSet,
  watchSet,
}: UseTimelineFiltersProps): UseTimelineFiltersReturn {
  const [filter, setFilter] = useState<FilterType>("all");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const filterPopoverRef = useRef<HTMLDivElement | null>(null);

  // Restore from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FILTER_STORAGE_KEY);
      if (saved === "friends" || saved === "watched" || saved === "all") {
        setFilter(saved);
      }
      const savedTag = localStorage.getItem(TAG_FILTER_STORAGE_KEY);
      if (savedTag) setTagFilter(savedTag);
    } catch {}
  }, []);

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(e.target as Node)) {
        setShowFilterPopover(false);
      }
    }
    if (showFilterPopover) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFilterPopover]);

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    try {
      localStorage.setItem(FILTER_STORAGE_KEY, newFilter);
    } catch {}
  };

  const handleTagFilterChange = (newTag: string) => {
    setTagFilter(newTag);
    try {
      localStorage.setItem(TAG_FILTER_STORAGE_KEY, newTag);
    } catch {}
  };

  const filteredRows = useMemo(() => {
    let result = rows;

    // Friend/Watch filter
    if (filter === "friends") {
      result = result.filter((r) => {
        const ownerId = r.album.ownerId;
        return friendSet.has(ownerId) || ownerId === user?.uid;
      });
    } else if (filter === "watched") {
      result = result.filter((r) => watchSet.has(r.album.ownerId));
    }

    // Tag filter
    if (tagFilter.trim()) {
      const normalizedTag = tagFilter.trim().toLowerCase();
      result = result.filter((r) => {
        const albumTags = ((r.album as any).tags || []).map((t: string) => t.toLowerCase());
        if (albumTags.includes(normalizedTag)) return true;

        const ownerTags = ((r.owner as any)?.tags || []).map((t: string) => t.toLowerCase());
        if (ownerTags.includes(normalizedTag)) return true;

        return false;
      });
    }

    return result;
  }, [rows, filter, friendSet, watchSet, user?.uid, tagFilter]);

  const activeFilterCount = (filter !== "all" ? 1 : 0) + (tagFilter.trim() ? 1 : 0);

  return {
    filter,
    setFilter,
    tagFilter,
    setTagFilter,
    showFilterPopover,
    setShowFilterPopover,
    filterPopoverRef,
    filteredRows,
    activeFilterCount,
    handleFilterChange,
    handleTagFilterChange,
  };
}
