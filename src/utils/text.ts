import type { FolderDoc, FolderId, SongDoc } from "../types";

const collator = new Intl.Collator("pt-BR", {
  sensitivity: "base",
  numeric: true,
  ignorePunctuation: true,
});

export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export function comparePtBr(a: string, b: string): number {
  const base = collator.compare(normalizeForSearch(a), normalizeForSearch(b));
  return base || collator.compare(a, b);
}

export function sortFolders(folders: FolderDoc[]): FolderDoc[] {
  return [...folders].sort((a, b) => comparePtBr(a.name, b.name));
}

export function sortSongs(songs: SongDoc[]): SongDoc[] {
  return [...songs].sort(
    (a, b) => comparePtBr(a.title, b.title) || comparePtBr(a.artist, b.artist),
  );
}

export function getFolderPath(folderId: FolderId, folders: FolderDoc[]): FolderDoc[] {
  if (!folderId) {
    return [];
  }

  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const path: FolderDoc[] = [];
  const visited = new Set<string>();
  let currentId: FolderId = folderId;

  while (currentId && !visited.has(currentId)) {
    const folder = byId.get(currentId);
    if (!folder) {
      break;
    }

    visited.add(currentId);
    path.unshift(folder);
    currentId = folder.parentId;
  }

  return path;
}

export function getFolderPathLabel(folderId: FolderId, folders: FolderDoc[]): string {
  const names = getFolderPath(folderId, folders).map((folder) => folder.name);
  return ["Início", ...names].join(" / ");
}

export function getDescendantFolderIds(folderId: string, folders: FolderDoc[]): string[] {
  const result: string[] = [];
  const stack = [folderId];

  while (stack.length > 0) {
    const parent = stack.pop();
    const children = folders.filter((folder) => folder.parentId === parent);

    for (const child of children) {
      result.push(child.id);
      stack.push(child.id);
    }
  }

  return result;
}

export function wouldCreateFolderCycle(
  folderId: string,
  nextParentId: FolderId,
  folders: FolderDoc[],
): boolean {
  if (!nextParentId) {
    return false;
  }

  if (nextParentId === folderId) {
    return true;
  }

  return getDescendantFolderIds(folderId, folders).includes(nextParentId);
}

export function formatDate(value: { toDate: () => Date } | null): string {
  if (!value) {
    return "Sem data";
  }

  return value.toDate().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}
