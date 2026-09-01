import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { AuthScreen } from "./components/AuthScreen";
import { useAuth } from "./hooks/useAuth";
import { auth, firebaseErrorMessage } from "./lib/firebase";
import type { FolderId, LibraryData, ToastKind, ToastState } from "./types";

const HomeView = lazy(() => import("./components/HomeView").then((module) => ({ default: module.HomeView })));
const SongEditorView = lazy(() =>
  import("./components/SongEditorView").then((module) => ({ default: module.SongEditorView })),
);
const SongView = lazy(() => import("./components/SongView").then((module) => ({ default: module.SongView })));

type AppRoute =
  | { view: "home"; folderId: FolderId }
  | { view: "song"; songId: string }
  | { view: "editor"; mode: "new"; folderId: FolderId }
  | { view: "editor"; mode: "edit"; songId: string };

function decodeRoutePart(value: string | undefined): string {
  return decodeURIComponent(value ?? "");
}

function parseHashRoute(): AppRoute {
  const rawHash = window.location.hash.replace(/^#\/?/, "");
  const [path = "", search = ""] = rawHash.split("?");
  const parts = path.split("/").filter(Boolean);

  if (parts[0] === "pasta") {
    return { view: "home", folderId: decodeRoutePart(parts[1]) || null };
  }

  if (parts[0] === "cifra" && parts[1] && parts[2] === "editar") {
    return { view: "editor", mode: "edit", songId: decodeRoutePart(parts[1]) };
  }

  if (parts[0] === "cifra" && parts[1]) {
    return { view: "song", songId: decodeRoutePart(parts[1]) };
  }

  if (parts[0] === "nova") {
    const params = new URLSearchParams(search);
    return { view: "editor", mode: "new", folderId: params.get("folder") || null };
  }

  return { view: "home", folderId: null };
}

function useHashRoute() {
  const [route, setRoute] = useState<AppRoute>(() => parseHashRoute());

  useEffect(() => {
    const update = () => setRoute(parseHashRoute());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  return route;
}

export function folderRoute(folderId: FolderId): string {
  return folderId ? `#/pasta/${encodeURIComponent(folderId)}` : "#/";
}

export function songRoute(songId: string): string {
  return `#/cifra/${encodeURIComponent(songId)}`;
}

export function editSongRoute(songId: string): string {
  return `#/cifra/${encodeURIComponent(songId)}/editar`;
}

export function newSongRoute(folderId: FolderId): string {
  return folderId ? `#/nova?folder=${encodeURIComponent(folderId)}` : "#/nova";
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <main className="loading-page" role="status">
      <div className="loading-spinner" aria-hidden="true" />
      <p>{message}</p>
    </main>
  );
}

function NotFoundView({ onHome }: { onHome: () => void }) {
  return (
    <main className="app-main centered-state">
      <h1>Item não encontrado</h1>
      <p>Ele pode ter sido excluído ou movido em outra sessão.</p>
      <button className="primary-button" onClick={onHome} type="button">
        Voltar ao início
      </button>
    </main>
  );
}

export function App() {
  const { user, loading: authLoading } = useAuth();
  const route = useHashRoute();
  const [library, setLibrary] = useState<LibraryData>({ folders: [], songs: [] });
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, kind: ToastKind = "success") => {
    setToast({ message, kind });
  };

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(null), toast.kind === "error" ? 6000 : 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!user) {
      setLibrary({ folders: [], songs: [] });
      setLibraryLoading(false);
      return undefined;
    }

    setLibraryLoading(true);
    setLibraryError("");

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void import("./services/firestore")
      .then(({ subscribeLibrary }) => {
        if (cancelled) {
          return;
        }

        unsubscribe = subscribeLibrary(
          user.uid,
          (data) => {
            setLibrary(data);
            setLibraryLoading(false);
          },
          (error) => {
            setLibraryError(firebaseErrorMessage(error));
            setLibraryLoading(false);
          },
        );
      })
      .catch((error) => {
        if (!cancelled) {
          setLibraryError(firebaseErrorMessage(error));
          setLibraryLoading(false);
        }
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [user]);

  const routeFolderExists = useMemo(() => {
    if (route.view !== "home" || route.folderId === null) {
      return true;
    }

    return library.folders.some((folder) => folder.id === route.folderId);
  }, [library.folders, route]);

  useEffect(() => {
    if (route.view === "home" && route.folderId && !libraryLoading && !routeFolderExists) {
      window.location.hash = "/";
    }
  }, [libraryLoading, route, routeFolderExists]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      window.location.hash = "/";
    } catch (error) {
      showToast(firebaseErrorMessage(error), "error");
    }
  };

  if (authLoading) {
    return <LoadingScreen message="Verificando sessão..." />;
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (libraryLoading) {
    return <LoadingScreen message="Carregando suas cifras..." />;
  }

  const goHome = () => {
    window.location.hash = "/";
  };

  const currentFolderId = route.view === "home" && routeFolderExists ? route.folderId : null;
  const currentSong =
    route.view === "song" || (route.view === "editor" && route.mode === "edit")
      ? library.songs.find((song) => song.id === route.songId)
      : undefined;

  return (
    <>
      {libraryError ? (
        <div className="global-error" role="alert">
          {libraryError}
        </div>
      ) : null}

      <Suspense fallback={<LoadingScreen message="Abrindo cifra..." />}>
        {route.view === "home" ? (
          <HomeView
            currentFolderId={currentFolderId}
            email={user.email}
            folders={library.folders}
            onEditSong={(songId) => {
              window.location.hash = editSongRoute(songId);
            }}
            onNewSong={(folderId) => {
              window.location.hash = newSongRoute(folderId);
            }}
            onOpenFolder={(folderId) => {
              window.location.hash = folderRoute(folderId);
            }}
            onOpenSong={(songId) => {
              window.location.hash = songRoute(songId);
            }}
            onSignOut={handleSignOut}
            onToast={showToast}
            songs={library.songs}
            uid={user.uid}
          />
        ) : null}

        {route.view === "song" && currentSong ? (
          <SongView
            email={user.email}
            folders={library.folders}
            onEdit={() => {
              window.location.hash = editSongRoute(currentSong.id);
            }}
            onGoFolder={(folderId) => {
              window.location.hash = folderRoute(folderId);
            }}
            onSignOut={handleSignOut}
            onToast={showToast}
            song={currentSong}
            uid={user.uid}
          />
        ) : null}

        {route.view === "editor" && route.mode === "new" ? (
          <SongEditorView
            email={user.email}
            folders={library.folders}
            initialFolderId={route.folderId}
            mode="new"
            onCancel={() => {
              window.location.hash = folderRoute(route.folderId);
            }}
            onSaved={(songId) => {
              window.location.hash = songRoute(songId);
            }}
            onSignOut={handleSignOut}
            onToast={showToast}
            uid={user.uid}
          />
        ) : null}

        {route.view === "editor" && route.mode === "edit" && currentSong ? (
          <SongEditorView
            email={user.email}
            folders={library.folders}
            mode="edit"
            onCancel={() => {
              window.location.hash = songRoute(currentSong.id);
            }}
            onSaved={(songId) => {
              window.location.hash = songRoute(songId);
            }}
            onSignOut={handleSignOut}
            onToast={showToast}
            song={currentSong}
            uid={user.uid}
          />
        ) : null}
      </Suspense>

      {route.view === "song" && !currentSong ? <NotFoundView onHome={goHome} /> : null}
      {route.view === "editor" && route.mode === "edit" && !currentSong ? (
        <NotFoundView onHome={goHome} />
      ) : null}

      {toast ? (
        <div className={`toast ${toast.kind}`} role="status">
          {toast.message}
        </div>
      ) : null}
    </>
  );
}
