"use client";
import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "app:search-history";
const MAX_HISTORY = 10;

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  // 履歴読み込み
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          setHistory(arr.filter((x) => typeof x === "string"));
        }
      }
    } catch {}
  }, []);

  // 履歴保存
  const saveHistory = useCallback((term: string) => {
    const base = term.trim();
    if (!base) return;
    setHistory((prev) => {
      const next = [base, ...prev.filter((x) => x !== base)].slice(0, MAX_HISTORY);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // 履歴クリア
  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  return {
    history,
    saveHistory,
    clearHistory,
  };
}
