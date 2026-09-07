import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { SongEditorView } from "../src/components/SongEditorView";
import { PresentationMode } from "../src/components/PresentationMode";
import { SongView } from "../src/components/SongView";
import "../src/styles.css";

function Harness() {
  const [content,setContent] = useState("");
  const [presentation,setPresentation] = useState(false);
  const [view,setView] = useState(false);
  const [active,setActive] = useState(false);
  const [speed,setSpeed] = useState(24);
  const [notice,setNotice] = useState("");
  useEffect(() => {
    const update = (event: Event) => setContent((event as CustomEvent<string>).detail);
    window.addEventListener("test-song", update);
    return () => window.removeEventListener("test-song", update);
  },[]);
  const song = { id: "fixture", title: "Música sintética", artist: "Teste", content, folderId: null, createdAt: null, updatedAt: null };
  return <>
    <button onClick={() => setPresentation(true)}>Apresentar fixture</button>
    <button onClick={() => setView(true)}>Visualizar fixture</button>
    <span>{notice}</span>
    {view ? <SongView song={song} uid="test" email={null} folders={[]} onGoFolder={() => {}} onEdit={() => setView(false)} onSignOut={() => {}} onToast={setNotice} /> :
    <SongEditorView key={content} mode="edit" song={song} uid="test" email={null} folders={[]} onCancel={() => {}} onSaved={() => {}} onSignOut={() => {}} onToast={setNotice} />}
    {presentation && <PresentationMode song={song} activeScroll={active} speed={speed} onActiveScrollChange={setActive} onSpeedChange={setSpeed} onExit={() => { setPresentation(false); if(document.fullscreenElement) void document.exitFullscreen(); }} />}
  </>;
}
createRoot(document.getElementById("root")!).render(<Harness />);
