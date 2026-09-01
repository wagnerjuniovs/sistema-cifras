import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { FolderDoc, FolderId, LibraryData, SongDoc, SongInput } from "../types";
import { getDescendantFolderIds, wouldCreateFolderCycle } from "../utils/text";

function foldersRef(uid: string) {
  return collection(db, "users", uid, "folders");
}

function songsRef(uid: string) {
  return collection(db, "users", uid, "songs");
}

function folderRef(uid: string, folderId: string) {
  return doc(db, "users", uid, "folders", folderId);
}

function songRef(uid: string, songId: string) {
  return doc(db, "users", uid, "songs", songId);
}

function mapFolder(snapshot: QueryDocumentSnapshot<DocumentData>): FolderDoc {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    name: String(data.name ?? ""),
    parentId: data.parentId ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

function mapSong(snapshot: QueryDocumentSnapshot<DocumentData>): SongDoc {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    title: String(data.title ?? ""),
    artist: String(data.artist ?? ""),
    content: String(data.content ?? ""),
    folderId: data.folderId ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export function subscribeLibrary(
  uid: string,
  onChange: (data: LibraryData) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  let folders: FolderDoc[] | null = null;
  let songs: SongDoc[] | null = null;

  const emit = () => {
    if (folders && songs) {
      onChange({ folders, songs });
    }
  };

  const unsubscribeFolders = onSnapshot(
    foldersRef(uid),
    (snapshot) => {
      folders = snapshot.docs.map(mapFolder);
      emit();
    },
    onError,
  );

  const unsubscribeSongs = onSnapshot(
    songsRef(uid),
    (snapshot) => {
      songs = snapshot.docs.map(mapSong);
      emit();
    },
    onError,
  );

  return () => {
    unsubscribeFolders();
    unsubscribeSongs();
  };
}

export async function createFolder(uid: string, name: string, parentId: FolderId): Promise<string> {
  const created = await addDoc(foldersRef(uid), {
    name: name.trim(),
    parentId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return created.id;
}

export function renameFolder(uid: string, folderId: string, name: string): Promise<void> {
  return updateDoc(folderRef(uid, folderId), {
    name: name.trim(),
    updatedAt: serverTimestamp(),
  });
}

export function moveFolder(
  uid: string,
  folderId: string,
  parentId: FolderId,
  folders: FolderDoc[],
): Promise<void> {
  if (wouldCreateFolderCycle(folderId, parentId, folders)) {
    return Promise.reject(new Error("Uma pasta não pode ser movida para dentro dela mesma."));
  }

  return updateDoc(folderRef(uid, folderId), {
    parentId,
    updatedAt: serverTimestamp(),
  });
}

async function commitDeleteRefs(refs: DocumentReference[]): Promise<void> {
  let batch = writeBatch(db);
  let count = 0;

  for (const ref of refs) {
    batch.delete(ref);
    count += 1;

    if (count === 450) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }
}

export async function deleteFolderTree(
  uid: string,
  folderId: string,
  folders: FolderDoc[],
  songs: SongDoc[],
): Promise<void> {
  const folderIds = new Set([folderId, ...getDescendantFolderIds(folderId, folders)]);
  const refs: DocumentReference[] = [];

  for (const id of folderIds) {
    refs.push(folderRef(uid, id));
  }

  for (const song of songs) {
    if (song.folderId && folderIds.has(song.folderId)) {
      refs.push(songRef(uid, song.id));
    }
  }

  await commitDeleteRefs(refs);
}

export async function createSong(uid: string, input: SongInput): Promise<string> {
  const created = await addDoc(songsRef(uid), {
    title: input.title.trim(),
    artist: input.artist.trim(),
    content: input.content,
    folderId: input.folderId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return created.id;
}

export function updateSong(uid: string, songId: string, input: SongInput): Promise<void> {
  return updateDoc(songRef(uid, songId), {
    title: input.title.trim(),
    artist: input.artist.trim(),
    content: input.content,
    folderId: input.folderId,
    updatedAt: serverTimestamp(),
  });
}

export function moveSong(uid: string, songId: string, folderId: FolderId): Promise<void> {
  return updateDoc(songRef(uid, songId), {
    folderId,
    updatedAt: serverTimestamp(),
  });
}

export function deleteSong(uid: string, songId: string): Promise<void> {
  return deleteDoc(songRef(uid, songId));
}
