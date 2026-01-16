"use client";
import React from "react";
import Link from "next/link";
import { Button } from "./Button";

interface NotFoundPageProps {
  title?: string;
  description?: string;
  showHomeButton?: boolean;
}

export function NotFoundPage({
  title = "ページが見つかりません",
  description = "お探しのページは存在しないか、削除されている可能性があります。",
  showHomeButton = true,
}: NotFoundPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="text-center">
        <p className="text-8xl font-bold text-muted/20 leading-none">404</p>
        <h1 className="text-2xl font-bold mt-4 text-foreground">{title}</h1>
        <p className="text-muted mt-2 max-w-md">{description}</p>
        
        {showHomeButton && (
          <Link href="/" className="mt-8 inline-block">
            <Button variant="primary" size="md">
              ホームに戻る
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
