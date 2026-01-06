/**
 * プロフィールページのデータ取得とソーシャル機能のフック
 */
import { useEffect, useRef, useState } from 'react';
import { useAuthUser } from '@/lib/hooks/useAuthUser';
import { getUserByHandle } from '@/lib/repos/userRepo';
import { listAlbumsByOwner, getAlbum } from '@/lib/repos/albumRepo';
import { listAlbumIdsByUploader } from '@/lib/repos/imageRepo';
import { listCommentsByUser } from '@/lib/repos/commentRepo';
import { getFriendStatus, listAcceptedFriends } from '@/lib/repos/friendRepo';
import { isWatched, listWatchers } from '@/lib/repos/watchRepo';
import { translateError } from '@/lib/errors';
import type { UserDoc, AlbumDoc, CommentDoc } from '@/types/models';

export type FriendState = 'none' | 'sent' | 'received' | 'accepted';

export interface ProfileStats {
  ownCount: number;
  joinedCount: number;
  commentCount: number;
}

export interface UseProfileDataResult {
  // Profile
  profile: UserDoc | null;
  loading: boolean;
  error: string | null;
  
  // Social
  friendState: FriendState;
  setFriendState: (state: FriendState) => void;
  watching: boolean;
  setWatching: (watching: boolean) => void;
  
  // Extra info
  ownAlbums: AlbumDoc[] | null;
  joinedAlbums: AlbumDoc[] | null;
  userComments: CommentDoc[] | null;
  stats: ProfileStats | null;
  loadingExtra: boolean;
  extraError: string | null;
  
  // Social counts
  watchersCount: number;
  friendsCount: number;
  watcherIds: string[];
  friendOtherIds: string[];
  
  // Helpers
  isOwnProfile: boolean;
  refreshProfile: () => void;
}

export function useProfileData(handleParam: string | undefined): UseProfileDataResult {
  const { user } = useAuthUser();
  
  // Base state
  const [profile, setProfile] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Social state
  const [friendState, setFriendState] = useState<FriendState>('none');
  const [watching, setWatching] = useState(false);
  
  // Extra info
  const [ownAlbums, setOwnAlbums] = useState<any[] | null>(null);
  const [joinedAlbums, setJoinedAlbums] = useState<any[] | null>(null);
  const [userComments, setUserComments] = useState<any[] | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loadingExtra, setLoadingExtra] = useState(false);
  const [extraError, setExtraError] = useState<string | null>(null);
  
  // Social counts
  const [watchersCount, setWatchersCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const watcherIdsRef = useRef<string[]>([]);
  const friendOtherIdsRef = useRef<string[]>([]);
  
  // Refresh counter
  const [refreshCounter, setRefreshCounter] = useState(0);
  
  const isOwnProfile = Boolean(user && profile && user.uid === profile.uid);
  
  // Load profile and social flags
  useEffect(() => {
    if (!handleParam) return;
    let active = true;
    
    (async () => {
      setLoading(true);
      setError(null);
      
      try {
        const p = await getUserByHandle(handleParam);
        if (!active) return;
        
        setProfile(p as UserDoc);
        
        let watchedFlag = false;
        if (user && p && p.uid !== user.uid) {
          const [forward, backward] = await Promise.all([
            getFriendStatus(user.uid, p.uid),
            getFriendStatus(p.uid, user.uid),
          ]);
          
          let st: FriendState = 'none';
          if (forward === 'accepted' || backward === 'accepted') st = 'accepted';
          else if (forward === 'pending') st = 'sent';
          else if (backward === 'pending') st = 'received';
          
          if (active) setFriendState(st);
          watchedFlag = await isWatched(user.uid, p.uid);
        } else {
          if (active) setFriendState('none');
        }
        
        if (active) setWatching(watchedFlag);
      } catch (e) {
        if (active) setError(translateError(e));
      } finally {
        if (active) setLoading(false);
      }
    })();
    
    return () => { active = false; };
  }, [handleParam, user, refreshCounter]);
  
  // Load extra info
  useEffect(() => {
    if (!profile?.uid) return;
    let active = true;
    
    (async () => {
      setLoadingExtra(true);
      setExtraError(null);
      
      try {
        const own = await listAlbumsByOwner(profile.uid);
        const joinedIds = await listAlbumIdsByUploader(profile.uid);
        const filteredIds = joinedIds.filter(id => !own.some(a => a.id === id));
        const joined = await Promise.all(filteredIds.map(id => getAlbum(id)));
        const comments = await listCommentsByUser(profile.uid, 50);
        
        // Watchers/friends counts
        let watcherIds: string[] = [];
        let friendOtherIds: string[] = [];
        
        try {
          watcherIds = await listWatchers(profile.uid);
        } catch {}
        
        try {
          const fdocs = await listAcceptedFriends(profile.uid);
          friendOtherIds = fdocs
            .map(fd => (fd.userId === profile.uid ? fd.targetId : fd.userId))
            .filter(Boolean);
        } catch {}
        
        if (active) {
          setOwnAlbums(own);
          setJoinedAlbums(joined.filter(a => !!a));
          setUserComments(comments);
          setStats({
            ownCount: own.length,
            joinedCount: filteredIds.length,
            commentCount: comments.length,
          });
          setWatchersCount(watcherIds.length);
          setFriendsCount(friendOtherIds.length);
          watcherIdsRef.current = watcherIds;
          friendOtherIdsRef.current = friendOtherIds;
        }
      } catch (e) {
        if (active) setExtraError(translateError(e));
      } finally {
        if (active) setLoadingExtra(false);
      }
    })();
    
    return () => { active = false; };
  }, [profile?.uid, refreshCounter]);
  
  const refreshProfile = () => setRefreshCounter(c => c + 1);
  
  return {
    profile,
    loading,
    error,
    friendState,
    setFriendState,
    watching,
    setWatching,
    ownAlbums,
    joinedAlbums,
    userComments,
    stats,
    loadingExtra,
    extraError,
    watchersCount,
    friendsCount,
    watcherIds: watcherIdsRef.current,
    friendOtherIds: friendOtherIdsRef.current,
    isOwnProfile,
    refreshProfile,
  };
}
