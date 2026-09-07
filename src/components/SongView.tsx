import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Edit3,
  LogOut,
  Maximize2,
  MoveRight,
  Music2,
  Printer,
  Trash2,
} from "lucide-react";
import { AutoScrollControls } from "./AutoScrollControls";
import { ChordText } from "./ChordText";
import { FolderPicker } from "./FolderPicker";
import { Modal } from "./Modal";
import { PresentationMode } from "./PresentationMode";
import { useAutoScroll } from "../hooks/useAutoScroll";
import { createFolder, deleteSong, moveSong } from "../services/firestore";
import type { FolderDoc, FolderId, SongDoc, ToastKind } from "../types";
import { firebaseErrorMessage } from "../lib/firebase";
import { formatDate, getFolderPath, getFolderPathLabel } from "../utils/text";

interface SongViewProps {
  uid: string;
  email: string | null;
  song: SongDoc;
  folders: FolderDoc[];
  onGoFolder: (folderId: FolderId) => void;
  onEdit: () => void;
  onSignOut: () => void;
  onToast: (message: string, kind?: ToastKind) => void;
}

function errorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : firebaseErrorMessage(error);
}

function readSavedSpeed(songId: string): number {
  const stored = window.localStorage.getItem(`cifra-scroll-speed:${songId}`);
  const parsed = stored ? Number(stored) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 42;
}

export function SongView({
  uid,
  email,
  song,
  folders,
  onGoFolder,
  onEdit,
  onSignOut,
  onToast,
}: SongViewProps) {
  const [moveOpen, setMoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<FolderId>(song.folderId);
  const [busy, setBusy] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [speed, setSpeed] = useState(() => readSavedSpeed(song.id));
  const [presentationOpen, setPresentationOpen] = useState(false);
  const breadcrumbs = getFolderPath(song.folderId, folders);

  useAutoScroll(null, autoScroll && !presentationOpen, speed);

  useEffect(() => {
    setSpeed(readSavedSpeed(song.id));
    setAutoScroll(false);
  }, [song.id]);

  useEffect(() => {
    window.localStorage.setItem(`cifra-scroll-speed:${song.id}`, String(speed));
  }, [song.id, speed]);

  useEffect(() => {
    let f11RequestedUntil = 0;
    const handleFullscreenKey = (event: KeyboardEvent) => {
      if (event.key === "F11") f11RequestedUntil = Date.now() + 2000;
    };
    const detectBrowserFullscreen = () => {
      const looksFullscreen =
        window.innerWidth >= 900 &&
        Math.abs(window.innerHeight - window.screen.height) <= 8 &&
        Math.abs(window.outerHeight - window.innerHeight) <= 8;

      if (looksFullscreen && Date.now() <= f11RequestedUntil) {
        f11RequestedUntil = 0;
        setPresentationOpen(true);
      }
    };

    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        setPresentationOpen(true);
      }
    };

    window.addEventListener("resize", detectBrowserFullscreen);
    window.addEventListener("keydown", handleFullscreenKey);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      window.removeEventListener("resize", detectBrowserFullscreen);
      window.removeEventListener("keydown", handleFullscreenKey);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const createFolderFromPicker = async (name: string, parentId: FolderId) => {
    try {
      const createdId = await createFolder(uid, name, parentId);
      onToast("Pasta criada.");
      return createdId;
    } catch (error) {
      onToast(errorMessage(error), "error");
      throw error;
    }
  };

  const handleMove = async () => {
    setBusy(true);

    try {
      await moveSong(uid, song.id, moveTarget);
      onToast("Cifra movida.");
      setMoveOpen(false);
    } catch (error) {
      onToast(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);

    try {
      await deleteSong(uid, song.id);
      onToast("Cifra excluída.");
      onGoFolder(song.folderId);
    } catch (error) {
      onToast(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const closePresentation = () => {
    setPresentationOpen(false);

    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
  };

  return (
    <main className="app-main song-main">
      <header className="app-header no-print">
        <button className="secondary-button" onClick={() => onGoFolder(song.folderId)} type="button">
          <ArrowLeft aria-hidden="true" size={18} />
          Pasta
        </button>
        <div className="header-actions">
          <span className="user-email">{email}</span>
          <button className="secondary-button" onClick={onSignOut} type="button">
            <LogOut aria-hidden="true" size={18} />
            Sair
          </button>
        </div>
      </header>

      <nav className="breadcrumbs no-print" aria-label="Caminho atual">
        <button onClick={() => onGoFolder(null)} type="button">
          Início
        </button>
        {breadcrumbs.map((folder) => (
          <button key={folder.id} onClick={() => onGoFolder(folder.id)} type="button">
            {folder.name}
          </button>
        ))}
      </nav>

      <article className="song-document">
        <header className="song-header">
          <div>
            <p className="eyebrow">{getFolderPathLabel(song.folderId, folders)}</p>
            <h1>{song.title}</h1>
            <p className="song-artist">{song.artist || "Sem cantor informado"}</p>
          </div>
          <div className="song-actions no-print">
            <button className="secondary-button" onClick={onEdit} type="button">
              <Edit3 aria-hidden="true" size={18} />
              Editar
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                setMoveTarget(song.folderId);
                setMoveOpen(true);
              }}
              type="button"
            >
              <MoveRight aria-hidden="true" size={18} />
              Mover
            </button>
            <button className="secondary-button" onClick={() => window.print()} type="button">
              <Printer aria-hidden="true" size={18} />
              Imprimir / Salvar em PDF
            </button>
            <button className="secondary-button" onClick={() => setPresentationOpen(true)} type="button">
              <Maximize2 aria-hidden="true" size={18} />
              Tela cheia
            </button>
            <button className="danger-button" onClick={() => setDeleteOpen(true)} type="button">
              <Trash2 aria-hidden="true" size={18} />
              Excluir
            </button>
          </div>
        </header>

        <dl className="song-meta no-print">
          <div>
            <dt>Criada</dt>
            <dd>{formatDate(song.createdAt)}</dd>
          </div>
          <div>
            <dt>Alterada</dt>
            <dd>{formatDate(song.updatedAt)}</dd>
          </div>
        </dl>

        <pre className="song-text">
          <ChordText content={song.content} />
        </pre>
      </article>

      <div className="floating-scroll no-print">
        <AutoScrollControls
          active={autoScroll}
          onActiveChange={setAutoScroll}
          onSpeedChange={setSpeed}
          speed={speed}
        />
      </div>

      {moveOpen ? (
        <Modal
          footer={
            <>
              <button className="secondary-button" onClick={() => setMoveOpen(false)} type="button">
                Cancelar
              </button>
              <button className="primary-button" disabled={busy} onClick={handleMove} type="button">
                Mover
              </button>
            </>
          }
          onClose={() => setMoveOpen(false)}
          title="Mover cifra"
        >
          <FolderPicker
            allowCreate
            folders={folders}
            label="Destino"
            onChange={setMoveTarget}
            onCreateFolder={createFolderFromPicker}
            value={moveTarget}
          />
        </Modal>
      ) : null}

      {deleteOpen ? (
        <Modal
          destructive
          footer={
            <>
              <button className="secondary-button" onClick={() => setDeleteOpen(false)} type="button">
                Cancelar
              </button>
              <button className="danger-button" disabled={busy} onClick={handleDelete} type="button">
                Excluir
              </button>
            </>
          }
          onClose={() => setDeleteOpen(false)}
          title="Excluir cifra"
        >
          <p>
            A cifra <strong>{song.title}</strong> será excluída. Essa ação não pode ser desfeita.
          </p>
        </Modal>
      ) : null}

      {presentationOpen ? (
        <PresentationMode
          activeScroll={autoScroll}
          onActiveScrollChange={setAutoScroll}
          onExit={closePresentation}
          onSpeedChange={setSpeed}
          song={song}
          speed={speed}
        />
      ) : null}
    </main>
  );
}
