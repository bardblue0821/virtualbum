"use client";
import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { getUserByHandle, updateUser } from '@/lib/repos/userRepo';
import { getUserTags, updateUserTags, getAllUserTags } from '@/lib/repos/tagRepo';
import { translateError } from '@/lib/errors';
import { useToast } from '@/components/ui/Toast';

export interface ProfileData {
  uid: string;
  displayName?: string | null;
  handle?: string | null;
  iconURL?: string | null;
  iconFullURL?: string | null;
  iconUpdatedAt?: any;
  bio?: string | null;
  vrchatUrl?: string | null;
  links?: string[];
  createdAt?: any;
}

interface UseProfileReturn {
  profile: ProfileData | null;
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  setProfile: (profile: ProfileData | ((prev: ProfileData | null) => ProfileData | null)) => void;
  
  // User tags
  userTags: string[];
  setUserTags: (tags: string[]) => void;
  tagCandidates: string[];
  savingTags: boolean;
  handleSaveTags: (newTags: string[]) => Promise<void>;
  
  // Profile edit
  handleSaveProfile: (newBio: string, newUrl: string, newTags: string[]) => Promise<void>;
}

/**
 * プロフィールデータとユーザータグを管理するカスタムフック
 */
export function useProfile(
  handleParam: string | undefined,
  user: User | null | undefined
): UseProfileReturn {
  const { show } = useToast();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User tags
  const [userTags, setUserTags] = useState<string[]>([]);
  const [tagCandidates, setTagCandidates] = useState<string[]>([]);
  const [savingTags, setSavingTags] = useState(false);

  const isMe = user && profile && user.uid === profile.uid;

  // Load profile
  useEffect(() => {
    if (!handleParam) return;
    let active = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const p = await getUserByHandle(handleParam);
        if (active) setProfile(p as ProfileData | null);
      } catch (e: any) {
        if (active) setError(translateError(e));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [handleParam]);

  // Load user tags
  useEffect(() => {
    if (!profile?.uid) return;
    let active = true;

    (async () => {
      try {
        const [tags, candidates] = await Promise.all([
          getUserTags(profile.uid),
          getAllUserTags(100),
        ]);
        if (active) {
          setUserTags(tags);
          setTagCandidates(candidates);
        }
      } catch (e) {
        console.warn('Failed to load user tags:', e);
      }
    })();

    return () => {
      active = false;
    };
  }, [profile?.uid]);

  // Save tags
  const handleSaveTags = useCallback(
    async (newTags: string[]) => {
      if (!user || !profile?.uid || profile.uid !== user.uid) return;
      setSavingTags(true);
      try {
        await updateUserTags(profile.uid, newTags);
        setUserTags(newTags);
        show({ message: 'タグを保存しました', variant: 'success' });
      } catch (e: any) {
        show({ message: e.message || 'タグの保存に失敗しました', variant: 'error' });
      } finally {
        setSavingTags(false);
      }
    },
    [user, profile?.uid, show]
  );

  // Save profile (bio, url, tags)
  const handleSaveProfile = useCallback(
    async (newBio: string, newUrl: string, newTags: string[]) => {
      if (!user || !profile?.uid || profile.uid !== user.uid) return;

      const patch: Record<string, any> = {};
      if (newBio !== (profile.bio || '')) patch.bio = newBio;
      if (newUrl !== (profile.vrchatUrl || '')) patch.vrchatUrl = newUrl;

      await updateUser(profile.uid, patch);
      await updateUserTags(profile.uid, newTags);

      setProfile({ ...profile, ...patch });
      setUserTags(newTags);
      show({ message: 'プロフィールを保存しました', variant: 'success' });
    },
    [user, profile, show]
  );

  return {
    profile,
    loading,
    error,
    setError,
    setProfile,
    userTags,
    setUserTags,
    tagCandidates,
    savingTags,
    handleSaveTags,
    handleSaveProfile,
  };
}
