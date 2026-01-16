"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import TagInput from '@/components/form/TagInput';

interface ProfileEditModalProps {
  open: boolean;
  onClose: () => void;
  bio: string;
  url: string;
  tags: string[];
  tagCandidates: string[];
  onSave: (bio: string, url: string, tags: string[]) => Promise<void>;
}

export default function ProfileEditModal({
  open,
  onClose,
  bio,
  url,
  tags,
  tagCandidates,
  onSave,
}: ProfileEditModalProps) {
  const [editBio, setEditBio] = useState(bio);
  const [editUrl, setEditUrl] = useState(url);
  const [editTags, setEditTags] = useState<string[]>(tags);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // モーダルが開いたときに初期値をリセット
  React.useEffect(() => {
    if (open) {
      setEditBio(bio);
      setEditUrl(url);
      setEditTags(tags);
      setError(null);
    }
  }, [open, bio, url, tags]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // URLのバリデーション
      if (editUrl && !/^https?:\/\//.test(editUrl)) {
        throw new Error('URLはhttp/httpsで始まる必要があります');
      }
      await onSave(editBio.trim(), editUrl.trim(), editTags);
      onClose();
    } catch (e: any) {
      setError(e.message || '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!saving) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleCancel}
    >
      <div 
        className="bg-background border border-line rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">プロフィールを編集</h2>

          {/* 自己紹介 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">自己紹介</label>
            <textarea
              className="w-full border border-line rounded-md p-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[--accent]"
              rows={4}
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              placeholder="自己紹介を入力してください"
              disabled={saving}
            />
          </div>

          {/* URL */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">URL</label>
            <input
              type="url"
              className="w-full border border-line rounded-md p-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[--accent]"
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              placeholder="https://example.com"
              disabled={saving}
            />
          </div>

          {/* タグ */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">タグ</label>
            <TagInput
              tags={editTags}
              onChange={setEditTags}
              candidates={tagCandidates}
              placeholder="タグを入力（Enterで追加）"
              maxTags={5}
            />
            <p className="text-xs text-muted">最大5つまで設定できます</p>
          </div>

          <ErrorMessage error={error} />

          {/* ボタン */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCancel}
              disabled={saving}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
