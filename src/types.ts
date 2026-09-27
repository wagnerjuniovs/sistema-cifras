import type { Timestamp } from "firebase/firestore";

export type FolderId = string | null;
export type SongStatus = "pending" | "ready";

export interface FolderDoc {
  id: string;
  name: string;
  parentId: FolderId;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface SongDoc {
  status?: SongStatus;
  id: string;
  title: string;
  artist: string;
  content: string;
  folderId: FolderId;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface LibraryData {
  folders: FolderDoc[];
  songs: SongDoc[];
}

export interface SongInput {
  status?: SongStatus;
  title: string;
  artist: string;
  content: string;
  folderId: FolderId;
}

export type ToastKind = "success" | "error" | "info";

export interface ToastState {
  message: string;
  kind: ToastKind;
}
