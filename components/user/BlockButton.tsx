"use client";

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import BlockConfirmModal from './BlockConfirmModal';

export interface BlockButtonProps {
  blocked: boolean;
  busy: boolean;
  onToggle: () => Promise<void>;
  className?: string;
}

/**
 * ブロック/ブロック解除ボタン
 */
export default function BlockButton({ blocked, busy, onToggle, className = '' }: BlockButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleClick = () => {
    setModalOpen(true);
  };

  const handleConfirm = async () => {
    await onToggle();
    setModalOpen(false);
  };

  const handleCancel = () => {
    if (!busy) {
      setModalOpen(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={blocked ? 'danger' : 'ghost'}
        size="sm"
        onClick={handleClick}
        disabled={busy}
        className={className}
      >
        {blocked ? 'ブロック中' : 'ブロック'}
      </Button>

      <BlockConfirmModal
        open={modalOpen}
        blocked={blocked}
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}
