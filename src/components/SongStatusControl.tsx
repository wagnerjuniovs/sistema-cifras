import { useRef, useState } from "react";
import { CheckCircle2, Clock3 } from "lucide-react";
import { setSongStatus } from "../services/firestore";
import { firebaseErrorMessage } from "../lib/firebase";
import type { SongDoc, ToastKind } from "../types";

export function SongStatusBadge({ song }: { song: SongDoc }) {
  const ready = song.status === "ready";
  return <span className={`song-status ${ready ? "ready" : "pending"}`}>
    {ready ? <CheckCircle2 size={16} aria-hidden="true" /> : <Clock3 size={16} aria-hidden="true" />}
    {ready ? "Pronta para tocar" : "Pendente de revisão"}
  </span>;
}

export function SongStatusControl({ uid, song, onToast }: {
  uid: string;
  song: SongDoc;
  onToast: (message: string, kind?: ToastKind) => void;
}) {
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const ready = song.status === "ready";
  async function toggle() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    try {
      await setSongStatus(uid, song.id, ready ? "pending" : "ready");
      onToast(ready ? "Cifra marcada como pendente." : "Cifra pronta para tocar.");
    } catch (error) {
      onToast(firebaseErrorMessage(error), "error");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return <button className="secondary-button song-status-button" type="button" disabled={busy}
    aria-label={`${ready ? "Marcar como pendente" : "Marcar como pronta"}: ${song.title}`}
    onClick={() => void toggle()}>
    {ready ? <Clock3 size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
    {busy ? "Salvando..." : ready ? "Marcar como pendente" : "Marcar como pronta"}
  </button>;
}
