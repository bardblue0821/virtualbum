import { db } from "@/lib/firebase";
import { COL } from "@/lib/paths";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, startAt, endAt, where } from "firebase/firestore";

function prefixQuery(col: string, field: string, q: string, take = 20) {
  return query(
    collection(db, col),
    orderBy(field),
    startAt(q),
    endAt(q + "\uf8ff"),
    limit(take)
  );
}

export type UserHit = { uid: string; displayName?: string; handle?: string; iconURL?: string };
export type AlbumHit = {
  id: string;
  title?: string;
  description?: string;
  ownerId?: string;
  ownerName?: string;
  ownerHandle?: string;
  ownerIconURL?: string;
  createdAt?: any;
  firstImageUrl?: string;
};

export async function searchUsersPrefix(qRaw: string, take = 20): Promise<UserHit[]> {
  const q = qRaw.trim().toLowerCase();
  if (!q) return [];
  const hits: Record<string, UserHit> = {};
  // handle 優先
  try {
    const snap = await getDocs(prefixQuery(COL.users, "handle", q, take));
    snap.forEach((d) => {
      const v: any = d.data();
      hits[v.handle || v.uid || d.id] = { uid: v.uid || d.id, displayName: v.displayName, handle: v.handle, iconURL: v.iconURL };
    });
  } catch {}
  // displayName 補完
  try {
    const snap = await getDocs(prefixQuery(COL.users, "displayName", q, take));
    snap.forEach((d) => {
      const v: any = d.data();
      const key = v.handle || v.uid || d.id;
      if (!hits[key]) hits[key] = { uid: v.uid || d.id, displayName: v.displayName, handle: v.handle, iconURL: v.iconURL };
    });
  } catch {}
  return Object.values(hits).slice(0, take);
}

export async function searchAlbumsPrefix(qRaw: string, take = 20): Promise<AlbumHit[]> {
  const q = qRaw.trim().toLowerCase();
  if (!q) return [];
  const byId: Record<string, AlbumHit> = {};
  // title
  try {
    const snap = await getDocs(prefixQuery(COL.albums, "title", q, take));
    snap.forEach((d) => {
      const v: any = d.data();
      byId[d.id] = { id: d.id, title: v.title, description: v.description, ownerId: v.ownerId, createdAt: v.createdAt };
    });
  } catch {}
  // description
  try {
    const snap = await getDocs(prefixQuery(COL.albums, "description", q, take));
    snap.forEach((d) => {
      const v: any = d.data();
      if (!byId[d.id]) byId[d.id] = { id: d.id, title: v.title, description: v.description, ownerId: v.ownerId, createdAt: v.createdAt };
    });
  } catch {}
  
  // 各アルバムの最初の画像URLを取得
  const albums = Object.values(byId).slice(0, take);
  
  // オーナー情報と画像URLを並列取得
  const ownerIds = [...new Set(albums.map(a => a.ownerId).filter(Boolean))];
  const ownerMap: Record<string, { displayName?: string; handle?: string; iconURL?: string }> = {};
  
  await Promise.all([
    // オーナー情報取得
    Promise.all(
      ownerIds.map(async (uid) => {
        try {
          const userDoc = await getDoc(doc(db, COL.users, uid as string));
          if (userDoc.exists()) {
            const u: any = userDoc.data();
            ownerMap[uid as string] = { displayName: u.displayName, handle: u.handle, iconURL: u.iconURL };
          }
        } catch {}
      })
    ),
    // 画像URL取得（orderByなしでシンプルに1件取得）
    Promise.all(
      albums.map(async (album) => {
        try {
          const imgQuery = query(
            collection(db, COL.albumImages),
            where("albumId", "==", album.id),
            limit(1)
          );
          const imgSnap = await getDocs(imgQuery);
          if (!imgSnap.empty) {
            const imgData: any = imgSnap.docs[0].data();
            album.firstImageUrl = imgData.thumbUrl || imgData.url;
          }
        } catch {}
      })
    ),
  ]);
  
  // オーナー情報をセット
  for (const album of albums) {
    if (album.ownerId && ownerMap[album.ownerId]) {
      const o = ownerMap[album.ownerId];
      album.ownerName = o.displayName;
      album.ownerHandle = o.handle;
      album.ownerIconURL = o.iconURL;
    }
  }
  
  return albums;
}

export async function searchAlbumsByCommentPrefix(qRaw: string, takeComments = 20): Promise<AlbumHit[]> {
  const q = qRaw.trim().toLowerCase();
  if (!q) return [];
  const albumIds = new Set<string>();
  try {
    const snap = await getDocs(prefixQuery(COL.comments, "body", q, takeComments));
    snap.forEach((d) => {
      const v: any = d.data();
      if (v.albumId) albumIds.add(v.albumId);
    });
  } catch {}
  const results: AlbumHit[] = [];
  // まとめて取得（個別 getDoc。将来 batched 改善可）
  await Promise.all(
    Array.from(albumIds).map(async (id) => {
      try {
        const ref = doc(db, COL.albums, id);
        const s = await getDoc(ref);
        if (s.exists()) {
          const v: any = s.data();
          const album: AlbumHit = { id, title: v.title, description: v.description, ownerId: v.ownerId, createdAt: v.createdAt };
          // 最初の画像URLを取得（orderByなしでシンプルに1件取得）
          try {
            const imgQuery = query(
              collection(db, COL.albumImages),
              where("albumId", "==", id),
              limit(1)
            );
            const imgSnap = await getDocs(imgQuery);
            if (!imgSnap.empty) {
              const imgData: any = imgSnap.docs[0].data();
              album.firstImageUrl = imgData.thumbUrl || imgData.url;
            }
          } catch {}
          results.push(album);
        }
      } catch {}
    })
  );
  
  // オーナー情報を取得
  const ownerIds = [...new Set(results.map(a => a.ownerId).filter(Boolean))];
  const ownerMap: Record<string, { displayName?: string; handle?: string; iconURL?: string }> = {};
  await Promise.all(
    ownerIds.map(async (uid) => {
      try {
        const userDoc = await getDoc(doc(db, COL.users, uid as string));
        if (userDoc.exists()) {
          const u: any = userDoc.data();
          ownerMap[uid as string] = { displayName: u.displayName, handle: u.handle, iconURL: u.iconURL };
        }
      } catch {}
    })
  );
  
  // オーナー情報をセット
  for (const album of results) {
    if (album.ownerId && ownerMap[album.ownerId]) {
      const o = ownerMap[album.ownerId];
      album.ownerName = o.displayName;
      album.ownerHandle = o.handle;
      album.ownerIconURL = o.iconURL;
    }
  }
  
  return results;
}
