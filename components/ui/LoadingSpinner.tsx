"use client";
import React from "react";

interface LoadingSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg";
  text?: string;
  fullScreen?: boolean;
}

const sizeClass = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

const textSizeClass = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export function LoadingSpinner({ size = "sm", text = "読み込み中...", fullScreen = false }: LoadingSpinnerProps) {
  const content = (
    <div className="flex items-center justify-center gap-2">
      <span
        className={`${sizeClass[size]} animate-spin rounded-full border-2 border-current border-t-transparent`}
        aria-hidden="true"
      />
      {text && <span className={`${textSizeClass[size]} fg-subtle`}>{text}</span>}
    </div>
  );

  if (fullScreen) {
    return <div className="flex items-center justify-center min-h-screen">{content}</div>;
  }

  return <div className="flex items-center justify-center py-4">{content}</div>;
}
