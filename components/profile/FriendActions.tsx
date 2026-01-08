"use client";
import React from "react";
import { Button } from "../ui/Button";

export type FriendState = "none" | "sent" | "received" | "accepted";

interface FriendActionsProps {
  state: FriendState;
  busy?: boolean;
  disabled?: boolean;
  onSend?: () => void;
  onCancel?: () => void;
  onAccept?: () => void;
  onRemove?: () => void;
}

export default function FriendActions({ state, busy = false, disabled = false, onSend, onCancel, onAccept, onRemove }: FriendActionsProps) {
  return (
    <section className="space-y-2">
      {(state === "none" || state === "sent") && (
        <Button
          disabled={busy || disabled}
          onClick={state === "none" ? onSend : onCancel}
          variant="ghostFriend"
          size="sm"
          className="min-w-[7rem] h-8"
        >
          {busy ? "処理中..." : state === "none" ? "フレンド申請" : "申請中"}
        </Button>
      )}
      {state === "received" && (
        <div className="flex gap-2">
          <Button disabled={busy || disabled} onClick={onAccept} variant="ghost" size="sm" className="text-foreground border-line min-w-[7rem] h-8">
            承認
          </Button>
          <Button disabled={busy || disabled} onClick={onCancel} variant="danger" size="sm" className="min-w-[7rem] h-8">
            拒否
          </Button>
        </div>
      )}
      {state === "accepted" && (
        <div className="flex gap-2 items-center">
          <Button disabled={busy || disabled} onClick={onRemove} variant="accentOrange" size="sm" className="text-foreground min-w-[7rem] h-8">
            フレンド
          </Button>
        </div>
      )}
    </section>
  );
}
 
