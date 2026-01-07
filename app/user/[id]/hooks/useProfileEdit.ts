/**
 * プロフィール編集のフック
 */
import { useState } from 'react';
import { updateUser } from '@/lib/repos/userRepo';
import { buildProfilePatch } from '@/src/services/profile/buildPatch';
import { useToast } from '@/components/ui/Toast';
import type { UserDoc } from '@/src/types/firestore';

export interface UseProfileEditResult {
  // Edit state
  editingField: string | null;
  editingValue: string;
  editingLinkIndex: number | null;
  editingOriginalValue: string;
  saving: boolean;
  detailsOpen: boolean;
  showDiscardConfirm: boolean;
  
  // Actions
  startEditing: (field: string, value: string, linkIndex?: number) => void;
  cancelEditing: () => void;
  saveField: (profile: UserDoc, onSuccess?: () => void) => Promise<void>;
  setEditingValue: (value: string) => void;
  setDetailsOpen: (open: boolean) => void;
  setShowDiscardConfirm: (show: boolean) => void;
  confirmDiscard: () => void;
  
  // Helpers
  hasUnsavedChanges: boolean;
}

export function useProfileEdit(): UseProfileEditResult {
  const { show } = useToast();
  
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [editingLinkIndex, setEditingLinkIndex] = useState<number | null>(null);
  const [editingOriginalValue, setEditingOriginalValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  
  const hasUnsavedChanges = editingField !== null && editingValue !== editingOriginalValue;
  
  const startEditing = (field: string, value: string, linkIndex?: number) => {
    setEditingField(field);
    setEditingValue(value);
    setEditingOriginalValue(value);
    setEditingLinkIndex(linkIndex ?? null);
  };
  
  const cancelEditing = () => {
    if (hasUnsavedChanges) {
      setShowDiscardConfirm(true);
    } else {
      setEditingField(null);
      setEditingValue('');
      setEditingOriginalValue('');
      setEditingLinkIndex(null);
    }
  };
  
  const confirmDiscard = () => {
    setEditingField(null);
    setEditingValue('');
    setEditingOriginalValue('');
    setEditingLinkIndex(null);
    setShowDiscardConfirm(false);
  };
  
  const saveField = async (profile: UserDoc, onSuccess?: () => void) => {
    if (!editingField || !profile?.uid || editingValue === editingOriginalValue) {
      setEditingField(null);
      return;
    }
    
    setSaving(true);
    
    try {
      const patch = await buildProfilePatch(editingField, editingValue, profile);
      await updateUser(profile.uid, patch);
      
      show({ message: '保存しました', variant: 'success' });
      setEditingField(null);
      setEditingValue('');
      setEditingOriginalValue('');
      setEditingLinkIndex(null);
      onSuccess?.();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '保存に失敗しました';
      show({ message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };
  
  return {
    editingField,
    editingValue,
    editingLinkIndex,
    editingOriginalValue,
    saving,
    detailsOpen,
    showDiscardConfirm,
    startEditing,
    cancelEditing,
    saveField,
    setEditingValue,
    setDetailsOpen,
    setShowDiscardConfirm,
    confirmDiscard,
    hasUnsavedChanges,
  };
}
