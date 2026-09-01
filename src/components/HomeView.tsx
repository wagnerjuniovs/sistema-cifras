import { useMemo, useState } from "react";
import {
  Edit3,
  FilePlus2,
  Folder,
  FolderPlus,
  LogOut,
  MoveRight,
  Music2,
  Search,
  Trash2,
} from "lucide-react";
import { Modal } from "./Modal";
import { FolderPicker } from "./FolderPicker";
import type { FolderDoc, FolderId, SongDoc, ToastKind } from "../types";
import {
  createFolder,
  deleteFolderTree,
  deleteSong,
  moveFolder,
  moveSong,
  renameFolder,
} from "../services/firestore";
import { firebaseErrorMessage } from "../lib/firebase";
import {
  getDescendantFolderIds,
  getFolderPath,
  getFolderPathLabel,
  normalizeForSearch,
  sortFolders,
  sortSongs,
} from "../utils/text";

interface HomeViewProps {
  uid: string;
  email: string | null;
  folders: FolderDoc[];
  songs: SongDoc[];
  currentFolderId: FolderId;
  onOpenFolder: (folderId: FolderId) => void;
  onOpenSong: (songId: string) => void;
  onNewSong: (folderId: FolderId) => void;
  onEditSong: (songId: string) => void;
  onSignOut: () => void;
  onToast: (message: string, kind?: ToastKind) => void;
}

function errorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : firebaseErrorMessage(error);
}

export function HomeView({
  uid,
  email,
  folders,
  songs,
  currentFolderId,
  onOpenFolder,
  onOpenSong,
  onNewSong,
  onEditSong,
  onSignOut,
  onToast,
}: HomeViewProps) {
  const [search, setSearch] = useState("");
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderToRename, setFolderToRename] = useState<FolderDoc | null>(null);
  const [folderToMove, setFolderToMove] = useState<FolderDoc | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<FolderDoc | null>(null);
  const [songToMove, setSongToMove] = useState<SongDoc | null>(null);
  const [songToDelete, setSongToDelete] = useState<SongDoc | null>(null);
  const [moveTarget, setMoveTarget] = useState<FolderId>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [busy, setBusy] = useState(false);

  const breadcrumbs = getFolderPath(currentFolderId, folders);
  const childFolders = useMemo(
    () => sortFolders(folders.filter((folder) => folder.parentId === currentFolderId)),
    [currentFolderId, folders],
  );
  const childSongs = useMemo(
    () => sortSongs(songs.filter((song) => song.folderId === currentFolderId)),
    [currentFolderId, songs],
  );
  const normalizedSearch = normalizeForSearch(search);

  const searchResults = useMemo(() => {
    if (!normalizedSearch) {
      return { folders: [], songs: [] };
    }

    const folderMatches = sortFolders(
      folders.filter((folder) => {
        const haystack = normalizeForSearch(`${folder.name} ${getFolderPathLabel(folder.id, folders)}`);
        return haystack.includes(normalizedSearch);
      }),
    );

    const songMatches = sortSongs(
      songs.filter((song) => {
        const haystack = normalizeForSearch(
          `${song.title} ${song.artist} ${getFolderPathLabel(song.folderId, folders)} ${song.content}`,
        );
        return haystack.includes(normalizedSearch);
      }),
    );

    return { folders: folderMatches, songs: songMatches };
  }, [folders, normalizedSearch, songs]);

  const createFolderHere = async (name: string, parentId: FolderId) => {
    const createdId = await createFolder(uid, name, parentId);
    onToast("Pasta criada.");
    return createdId;
  };

  const handleCreateFolder = async () => {
    const name = folderName.trim();

    if (!name) {
      return;
    }

    setBusy(true);

    try {
      await createFolderHere(name, currentFolderId);
      setFolderName("");
      setNewFolderOpen(false);
    } catch (error) {
      onToast(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleRenameFolder = async () => {
    if (!folderToRename || !folderName.trim()) {
      return;
    }

    setBusy(true);

    try {
      await renameFolder(uid, folderToRename.id, folderName);
      onToast("Pasta renomeada.");
      setFolderToRename(null);
      setFolderName("");
    } catch (error) {
      onToast(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleMoveFolder = async () => {
    if (!folderToMove) {
      return;
    }

    setBusy(true);

    try {
      await moveFolder(uid, folderToMove.id, moveTarget, folders);
      onToast("Pasta movida.");
      setFolderToMove(null);
    } catch (error) {
      onToast(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete || deleteConfirmation !== "EXCLUIR") {
      return;
    }

    setBusy(true);

    try {
      await deleteFolderTree(uid, folderToDelete.id, folders, songs);
      onToast("Pasta e conteúdo excluídos.");
      setFolderToDelete(null);
      setDeleteConfirmation("");
    } catch (error) {
      onToast(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleMoveSong = async () => {
    if (!songToMove) {
      return;
    }

    setBusy(true);

    try {
      await moveSong(uid, songToMove.id, moveTarget);
      onToast("Cifra movida.");
      setSongToMove(null);
    } catch (error) {
      onToast(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteSong = async () => {
    if (!songToDelete) {
      return;
    }

    setBusy(true);

    try {
      await deleteSong(uid, songToDelete.id);
      onToast("Cifra excluída.");
      setSongToDelete(null);
    } catch (error) {
      onToast(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const folderDeletionIds = folderToDelete
    ? new Set([folderToDelete.id, ...getDescendantFolderIds(folderToDelete.id, folders)])
    : new Set<string>();
  const folderDeletionSongCount = songs.filter((song) => song.folderId && folderDeletionIds.has(song.folderId)).length;

  return (
    <main className="app-main">
      <header className="app-header no-print">
        <button className="brand-button" onClick={() => onOpenFolder(null)} type="button">
          <span className="brand-mark" aria-hidden="true">
            <Music2 size={24} />
          </span>
          <span>Sistema de Cifras</span>
        </button>
        <div className="header-actions">
          <span className="user-email">{email}</span>
          <button className="secondary-button" onClick={onSignOut} type="button">
            <LogOut aria-hidden="true" size={18} />
            Sair
          </button>
        </div>
      </header>

      <section className="toolbar no-print">
        <div className="search-box">
          <Search aria-hidden="true" size={20} />
          <label className="sr-only" htmlFor="busca-geral">
            Pesquisar
          </label>
          <input
            id="busca-geral"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar música, cantor, pasta ou conteúdo"
            type="search"
            value={search}
          />
        </div>
        <div className="toolbar-actions">
          <button
            className="secondary-button"
            onClick={() => {
              setFolderName("");
              setNewFolderOpen(true);
            }}
            type="button"
          >
            <FolderPlus aria-hidden="true" size={18} />
            Nova pasta
          </button>
          <button className="primary-button" onClick={() => onNewSong(currentFolderId)} type="button">
            <FilePlus2 aria-hidden="true" size={18} />
            Nova cifra
          </button>
        </div>
      </section>

      {normalizedSearch ? (
        <section className="search-results" aria-label="Resultados da pesquisa">
          <div className="section-heading">
            <h1>Resultados</h1>
            <p>
              {searchResults.folders.length + searchResults.songs.length} item(ns) encontrados
            </p>
          </div>
          <div className="result-list">
            {searchResults.folders.map((folder) => (
              <button className="result-row" key={folder.id} onClick={() => onOpenFolder(folder.id)} type="button">
                <Folder aria-hidden="true" size={22} />
                <span>
                  <strong>{folder.name}</strong>
                  <small>Pasta · {getFolderPathLabel(folder.id, folders)}</small>
                </span>
              </button>
            ))}
            {searchResults.songs.map((song) => (
              <button className="result-row" key={song.id} onClick={() => onOpenSong(song.id)} type="button">
                <Music2 aria-hidden="true" size={22} />
                <span>
                  <strong>{song.title}</strong>
                  <small>
                    Cifra · {song.artist || "Sem cantor"} · {getFolderPathLabel(song.folderId, folders)}
                  </small>
                </span>
              </button>
            ))}
            {searchResults.folders.length === 0 && searchResults.songs.length === 0 ? (
              <div className="empty-state">
                <Search aria-hidden="true" size={34} />
                <h2>Nenhum resultado encontrado</h2>
                <p>Tente buscar por outro trecho, cantor ou pasta.</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : (
        <>
          <nav className="breadcrumbs no-print" aria-label="Caminho atual">
            <button onClick={() => onOpenFolder(null)} type="button">
              Início
            </button>
            {breadcrumbs.map((folder) => (
              <button key={folder.id} onClick={() => onOpenFolder(folder.id)} type="button">
                {folder.name}
              </button>
            ))}
          </nav>

          <section className="library-section">
            <div className="section-heading">
              <h1>{breadcrumbs[breadcrumbs.length - 1]?.name ?? "Minhas cifras"}</h1>
              <p>
                {childFolders.length} pasta(s) · {childSongs.length} cifra(s)
              </p>
            </div>

            {childFolders.length > 0 ? (
              <div className="tile-grid" aria-label="Pastas">
                {childFolders.map((folder) => (
                  <article className="library-tile folder-tile" key={folder.id}>
                    <button className="tile-open" onClick={() => onOpenFolder(folder.id)} type="button">
                      <Folder aria-hidden="true" size={36} />
                      <span>{folder.name}</span>
                    </button>
                    <div className="tile-actions">
                      <button
                        aria-label={`Renomear pasta ${folder.name}`}
                        className="icon-button subtle"
                        onClick={() => {
                          setFolderName(folder.name);
                          setFolderToRename(folder);
                        }}
                        type="button"
                      >
                        <Edit3 aria-hidden="true" size={18} />
                      </button>
                      <button
                        aria-label={`Mover pasta ${folder.name}`}
                        className="icon-button subtle"
                        onClick={() => {
                          setFolderToMove(folder);
                          setMoveTarget(folder.parentId);
                        }}
                        type="button"
                      >
                        <MoveRight aria-hidden="true" size={18} />
                      </button>
                      <button
                        aria-label={`Excluir pasta ${folder.name}`}
                        className="icon-button danger"
                        onClick={() => {
                          setFolderToDelete(folder);
                          setDeleteConfirmation("");
                        }}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" size={18} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}

            {childSongs.length > 0 ? (
              <div className="tile-grid songs-grid" aria-label="Cifras">
                {childSongs.map((song) => (
                  <article className="library-tile song-tile" key={song.id}>
                    <button className="tile-open" onClick={() => onOpenSong(song.id)} type="button">
                      <Music2 aria-hidden="true" size={34} />
                      <span>{song.title}</span>
                      <small>{song.artist || "Sem cantor"}</small>
                    </button>
                    <div className="tile-actions">
                      <button
                        aria-label={`Editar cifra ${song.title}`}
                        className="icon-button subtle"
                        onClick={() => onEditSong(song.id)}
                        type="button"
                      >
                        <Edit3 aria-hidden="true" size={18} />
                      </button>
                      <button
                        aria-label={`Mover cifra ${song.title}`}
                        className="icon-button subtle"
                        onClick={() => {
                          setSongToMove(song);
                          setMoveTarget(song.folderId);
                        }}
                        type="button"
                      >
                        <MoveRight aria-hidden="true" size={18} />
                      </button>
                      <button
                        aria-label={`Excluir cifra ${song.title}`}
                        className="icon-button danger"
                        onClick={() => setSongToDelete(song)}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" size={18} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}

            {childFolders.length === 0 && childSongs.length === 0 ? (
              <div className="empty-state">
                <Folder aria-hidden="true" size={38} />
                <h2>Pasta vazia</h2>
                <p>Crie uma pasta ou uma cifra para começar.</p>
              </div>
            ) : null}
          </section>
        </>
      )}

      {newFolderOpen ? (
        <Modal
          footer={
            <>
              <button className="secondary-button" onClick={() => setNewFolderOpen(false)} type="button">
                Cancelar
              </button>
              <button
                className="primary-button"
                disabled={busy || folderName.trim().length === 0}
                onClick={handleCreateFolder}
                type="button"
              >
                Criar
              </button>
            </>
          }
          onClose={() => setNewFolderOpen(false)}
          title="Nova pasta"
        >
          <label>
            <span>Nome da pasta</span>
            <input
              autoFocus
              onChange={(event) => setFolderName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleCreateFolder();
                }
              }}
              type="text"
              value={folderName}
            />
          </label>
        </Modal>
      ) : null}

      {folderToRename ? (
        <Modal
          footer={
            <>
              <button className="secondary-button" onClick={() => setFolderToRename(null)} type="button">
                Cancelar
              </button>
              <button
                className="primary-button"
                disabled={busy || folderName.trim().length === 0}
                onClick={handleRenameFolder}
                type="button"
              >
                Salvar
              </button>
            </>
          }
          onClose={() => setFolderToRename(null)}
          title="Renomear pasta"
        >
          <label>
            <span>Nome da pasta</span>
            <input
              autoFocus
              onChange={(event) => setFolderName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleRenameFolder();
                }
              }}
              type="text"
              value={folderName}
            />
          </label>
        </Modal>
      ) : null}

      {folderToMove ? (
        <Modal
          footer={
            <>
              <button className="secondary-button" onClick={() => setFolderToMove(null)} type="button">
                Cancelar
              </button>
              <button className="primary-button" disabled={busy} onClick={handleMoveFolder} type="button">
                Mover
              </button>
            </>
          }
          onClose={() => setFolderToMove(null)}
          title="Mover pasta"
        >
          <FolderPicker
            allowCreate
            excludeFolderId={folderToMove.id}
            folders={folders}
            label="Destino"
            onChange={setMoveTarget}
            onCreateFolder={createFolderHere}
            value={moveTarget}
          />
        </Modal>
      ) : null}

      {folderToDelete ? (
        <Modal
          destructive
          footer={
            <>
              <button className="secondary-button" onClick={() => setFolderToDelete(null)} type="button">
                Cancelar
              </button>
              <button
                className="danger-button"
                disabled={busy || deleteConfirmation !== "EXCLUIR"}
                onClick={handleDeleteFolder}
                type="button"
              >
                Excluir definitivamente
              </button>
            </>
          }
          onClose={() => setFolderToDelete(null)}
          title="Excluir pasta"
        >
          <p>
            A pasta <strong>{folderToDelete.name}</strong> será excluída junto com{" "}
            {folderDeletionIds.size - 1} subpasta(s) e {folderDeletionSongCount} cifra(s).
          </p>
          <p>Digite EXCLUIR para confirmar.</p>
          <label>
            <span>Confirmação</span>
            <input
              autoFocus
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              type="text"
              value={deleteConfirmation}
            />
          </label>
        </Modal>
      ) : null}

      {songToMove ? (
        <Modal
          footer={
            <>
              <button className="secondary-button" onClick={() => setSongToMove(null)} type="button">
                Cancelar
              </button>
              <button className="primary-button" disabled={busy} onClick={handleMoveSong} type="button">
                Mover
              </button>
            </>
          }
          onClose={() => setSongToMove(null)}
          title="Mover cifra"
        >
          <FolderPicker
            allowCreate
            folders={folders}
            label="Destino"
            onChange={setMoveTarget}
            onCreateFolder={createFolderHere}
            value={moveTarget}
          />
        </Modal>
      ) : null}

      {songToDelete ? (
        <Modal
          destructive
          footer={
            <>
              <button className="secondary-button" onClick={() => setSongToDelete(null)} type="button">
                Cancelar
              </button>
              <button className="danger-button" disabled={busy} onClick={handleDeleteSong} type="button">
                Excluir
              </button>
            </>
          }
          onClose={() => setSongToDelete(null)}
          title="Excluir cifra"
        >
          <p>
            A cifra <strong>{songToDelete.title}</strong> será excluída. Essa ação não pode ser desfeita.
          </p>
        </Modal>
      ) : null}
    </main>
  );
}
