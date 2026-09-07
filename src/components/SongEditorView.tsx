import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, LogOut, Music2, Save, WandSparkles } from "lucide-react";
import { ChordEditor, type ChordEditorHandle } from "./ChordEditor";
import { FolderPicker } from "./FolderPicker";
import { createFolder, createSong, updateSong } from "../services/firestore";
import { firebaseErrorMessage } from "../lib/firebase";
import type { FolderDoc, FolderId, SongDoc, SongInput, ToastKind } from "../types";
import { getFolderPathLabel } from "../utils/text";

type SongEditorViewProps = {
  uid: string;
  email: string | null;
  folders: FolderDoc[];
  onCancel: () => void;
  onSaved: (songId: string) => void;
  onSignOut: () => void;
  onToast: (message: string, kind?: ToastKind) => void;
} & (
  | {
      mode: "new";
      initialFolderId: FolderId;
      song?: never;
    }
  | {
      mode: "edit";
      song: SongDoc;
      initialFolderId?: never;
    }
);

function errorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : firebaseErrorMessage(error);
}

function sameSongInput(a: SongInput, b: SongInput): boolean {
  return (
    a.title === b.title &&
    a.artist === b.artist &&
    a.content === b.content &&
    a.folderId === b.folderId
  );
}

export function SongEditorView({
  uid,
  email,
  folders,
  onCancel,
  onSaved,
  onSignOut,
  onToast,
  ...props
}: SongEditorViewProps) {
  const editorIdentity = props.mode === "edit" ? `edit:${props.song.id}` : `new:${props.initialFolderId ?? "root"}`;
  const initialInput = useMemo<SongInput>(
    () =>
      props.mode === "edit"
        ? {
            title: props.song.title,
            artist: props.song.artist,
            content: props.song.content,
            folderId: props.song.folderId,
          }
        : {
            title: "",
            artist: "",
            content: "",
            folderId: props.initialFolderId,
          },
    [editorIdentity, props],
  );
  const editorRef = useRef<ChordEditorHandle>(null);
  const initialRef = useRef(initialInput);
  const allowRouteLeaveRef = useRef(false);
  const [title, setTitle] = useState(initialInput.title);
  const [artist, setArtist] = useState(initialInput.artist);
  const [content, setContent] = useState(initialInput.content);
  const [folderId, setFolderId] = useState<FolderId>(initialInput.folderId);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [localError, setLocalError] = useState("");

  const currentInput = useMemo<SongInput>(
    () => ({
      title,
      artist,
      content,
      folderId,
    }),
    [artist, content, folderId, title],
  );
  const dirty = !sameSongInput(currentInput, initialRef.current);

  useEffect(() => {
    initialRef.current = initialInput;
    setTitle(initialInput.title);
    setArtist(initialInput.artist);
    setContent(initialInput.content);
    setFolderId(initialInput.folderId);
    setSavedMessage("");
    setLocalError("");
  }, [editorIdentity]);

  const confirmLeave = () => {
    if (!dirty) {
      return true;
    }

    return window.confirm("Existem alterações não salvas. Deseja sair mesmo assim?");
  };

  const handleCreateFolder = async (name: string, parentId: FolderId) => {
    try {
      const createdId = await createFolder(uid, name, parentId);
      onToast("Pasta criada.");
      return createdId;
    } catch (error) {
      onToast(errorMessage(error), "error");
      throw error;
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setLocalError("Digite o nome da música.");
      return;
    }

    setSaving(true);
    setLocalError("");
    setSavedMessage("");

    try {
      const input: SongInput = {
        title: title.trim(),
        artist: artist.trim(),
        content,
        folderId,
      };

      let songId = "";

      if (props.mode === "edit") {
        await updateSong(uid, props.song.id, input);
        songId = props.song.id;
      } else {
        songId = await createSong(uid, input);
      }

      initialRef.current = input;
      setSavedMessage("Cifra salva.");
      onToast("Cifra salva.");
      allowRouteLeaveRef.current = true;
      onSaved(songId);
    } catch (error) {
      setLocalError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleCleanCifraClubPaste = () => editorRef.current?.repair();

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase("pt-BR") === "s") {
        event.preventDefault();
        void handleSave();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    let previousHash = window.location.hash;
    let restoring = false;

    const handleHashChange = () => {
      if (restoring || allowRouteLeaveRef.current) {
        restoring = false;
        previousHash = window.location.hash;
        allowRouteLeaveRef.current = false;
        return;
      }

      if (dirty && !window.confirm("Existem alterações não salvas. Deseja sair mesmo assim?")) {
        restoring = true;
        window.location.hash = previousHash || "#/";
      } else {
        previousHash = window.location.hash;
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [dirty]);

  return (
    <main className="app-main editor-main">
      <header className="app-header no-print">
        <button
          className="secondary-button"
          onClick={() => {
            if (confirmLeave()) {
              onCancel();
            }
          }}
          type="button"
        >
          <ArrowLeft aria-hidden="true" size={18} />
          Voltar
        </button>
        <div className="editor-header-title">
          <Music2 aria-hidden="true" size={22} />
          <span>{props.mode === "edit" ? "Editar cifra" : "Nova cifra"}</span>
        </div>
        <div className="header-actions">
          <span className="user-email">{email}</span>
          <button
            className="secondary-button"
            onClick={() => {
              if (confirmLeave()) {
                onSignOut();
              }
            }}
            type="button"
          >
            <LogOut aria-hidden="true" size={18} />
            Sair
          </button>
        </div>
      </header>

      <section className="editor-layout">
        <div className="editor-fields">
          <label>
            <span>Nome da música</span>
            <input
              autoFocus
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex.: É o Amor"
              type="text"
              value={title}
            />
          </label>
          <label>
            <span>Cantor, dupla, banda ou ministério</span>
            <input
              onChange={(event) => setArtist(event.target.value)}
              placeholder="Ex.: Zezé Di Camargo e Luciano"
              type="text"
              value={artist}
            />
          </label>
          <FolderPicker
            allowCreate
            folders={folders}
            label="Salvar em"
            onChange={setFolderId}
            onCreateFolder={handleCreateFolder}
            value={folderId}
          />
          <p className="subtle-text">Destino atual: {getFolderPathLabel(folderId, folders)}</p>
        </div>

        <section className="editor-surface" aria-label="Conteúdo da cifra">
          <div className="editor-status-row">
            <div>
              <h1>Conteúdo da cifra</h1>
              <div className="editor-status-pills">
                {dirty ? <span className="status-pill warning">Alterações não salvas</span> : null}
                {savedMessage ? <span className="status-pill success">{savedMessage}</span> : null}
              </div>
            </div>
            <button className="secondary-button cleaner-button" onClick={handleCleanCifraClubPaste} type="button">
              <WandSparkles aria-hidden="true" size={18} />
              Corrigir colagem
            </button>
          </div>
          <ChordEditor ref={editorRef} ariaLabel="Editor de cifra musical" onChange={setContent} value={content} />
        </section>
      </section>

      {localError ? (
        <p className="form-message error editor-error" role="alert">
          {localError}
        </p>
      ) : null}

      <footer className="editor-footer no-print">
        <button
          className="secondary-button"
          onClick={() => {
            if (confirmLeave()) {
              onCancel();
            }
          }}
          type="button"
        >
          Cancelar
        </button>
        <button className="primary-button" disabled={saving} onClick={handleSave} type="button">
          <Save aria-hidden="true" size={18} />
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </footer>
    </main>
  );
}
