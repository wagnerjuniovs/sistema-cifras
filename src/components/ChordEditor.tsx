import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { defaultKeymap, history, historyKeymap, undo, undoDepth, isolateHistory } from "@codemirror/commands";
import { EditorState, RangeSetBuilder, Transaction } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  keymap,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { findChordRanges } from "../utils/chords";
import { extractCifraClubChordText, repairMalformedCifraClubText } from "../utils/cifraClubCleaner";
import { Modal } from "./Modal";

interface ChordEditorProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}

export interface ChordEditorHandle {
  focus: () => void;
  replaceContent: (nextValue: string) => void;
  repair: () => void;
}

const chordMark = Decoration.mark({ class: "cm-chord-token" });

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();

  for (const visibleRange of view.visibleRanges) {
    let position = visibleRange.from;

    while (position <= visibleRange.to) {
      const line = view.state.doc.lineAt(position);

      for (const range of findChordRanges(line.text)) {
        builder.add(line.from + range.start, line.from + range.end, chordMark);
      }

      if (line.to + 1 > visibleRange.to) {
        break;
      }

      position = line.to + 1;
    }
  }

  return builder.finish();
}

const chordHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
  },
);

const editorTheme = EditorView.theme({
  "&": {
    minHeight: "420px",
    height: "100%",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    backgroundColor: "#fff",
  },
  ".cm-scroller": {
    fontFamily: "var(--mono)",
    fontSize: "15px",
    lineHeight: "1.55",
  },
  ".cm-content": {
    caretColor: "var(--accent)",
    padding: "16px",
    whiteSpace: "pre",
  },
  ".cm-focused": {
    outline: "2px solid color-mix(in srgb, var(--accent) 35%, transparent)",
    outlineOffset: "2px",
  },
  ".cm-line": {
    padding: "0",
  },
  ".cm-selectionBackground": {
    backgroundColor: "rgba(240, 90, 40, 0.18) !important",
  },
  ".cm-chord-token": {
    color: "var(--accent-strong)",
    fontWeight: "700",
  },
});

export const ChordEditor = forwardRef<ChordEditorHandle, ChordEditorProps>(function ChordEditor(
  { value, onChange, ariaLabel },
  ref,
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const [notice, setNotice] = useState("");
  const [canUndo, setCanUndo] = useState(false);
  const [proposal, setProposal] = useState<{ original: string; corrected: string; from: number; to: number } | null>(null);

  const replace = (nextValue: string) => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: nextValue },
      annotations: [Transaction.userEvent.of("input.clean-cifra-club"), isolateHistory.of("full")] });
    view.focus();
  };

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    repair: () => {
      const view = viewRef.current;
      if (!view) return;
      const original = view.state.doc.toString();
      const result = repairMalformedCifraClubText(original);
      if (result.confidence === "low") {
        setProposal({ original, corrected: result.content, from: 0, to: original.length });
      } else if (result.changed) {
        replace(result.content);
        setNotice("Colagem do Cifra Club formatada");
      } else setNotice("Nenhuma correção necessária.");
    },
    focus: () => {
      viewRef.current?.focus();
    },
    replaceContent: (nextValue: string) => {
      const view = viewRef.current;

      if (!view || view.state.doc.toString() === nextValue) {
        return;
      }

      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: nextValue,
        },
        selection: { anchor: nextValue.length },
        annotations: [Transaction.addToHistory.of(true), Transaction.userEvent.of("input.clean-cifra-club")],
      });
      view.focus();
    },
  }));

  useEffect(() => {
    if (!hostRef.current) {
      return undefined;
    }

    const state = EditorState.create({
      doc: value,
      extensions: [
        history(),
        EditorView.domEventHandlers({
          paste(event, view) {
            const html = event.clipboardData?.getData("text/html") ?? "";
            const plain = event.clipboardData?.getData("text/plain") ?? "";
            const extraction = extractCifraClubChordText(html);
            const repaired = repairMalformedCifraClubText(plain);
            if (!extraction.recognized && !repaired.changed && repaired.confidence !== "low") return false;
            event.preventDefault();
            const insert = extraction.recognized ? extraction.content : repaired.confidence === "high" ? repaired.content : plain;
            const from = view.state.selection.main.from;
            view.dispatch(view.state.replaceSelection(insert), {
              annotations: [Transaction.userEvent.of("input.paste"), isolateHistory.of("full")],
              scrollIntoView: true,
            });
            if (!extraction.recognized && repaired.confidence === "low") {
              setProposal({ original: plain, corrected: repaired.content, from, to: from + plain.length });
            } else setNotice("Colagem do Cifra Club formatada");
            return true;
          },
        }),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        chordHighlighter,
        editorTheme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
            setCanUndo(undoDepth(update.state) > 0);
          }
        }),
        EditorView.contentAttributes.of({
          "aria-label": ariaLabel,
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: hostRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [ariaLabel]);

  useEffect(() => {
    const view = viewRef.current;

    if (!view || view.state.doc.toString() === value) {
      return;
    }

    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: value,
      },
      annotations: Transaction.addToHistory.of(false),
    });
  }, [value]);

  return <>
    {notice ? <div className="paste-notice" role="status">{notice} {canUndo ? <button type="button" className="secondary-button" onClick={() => {
      if (viewRef.current) { undo(viewRef.current); viewRef.current.focus(); }
    }}>Desfazer</button> : null}</div> : null}
    <div className="chord-editor" ref={hostRef} />
    {proposal ? <Modal title="Conferir correção da colagem" onClose={() => setProposal(null)} footer={<>
      <button className="secondary-button" type="button" onClick={() => setProposal(null)}>Manter original</button>
      <button className="primary-button" type="button" onClick={() => {
        const view = viewRef.current;
        if (view && view.state.doc.sliceString(proposal.from, proposal.to) === proposal.original) {
          view.dispatch({ changes: { from: proposal.from, to: proposal.to, insert: proposal.corrected }, annotations: isolateHistory.of("full") });
          setNotice("Correção aplicada. Confira o alinhamento antes de salvar.");
        }
        setProposal(null);
        view?.focus();
      }}>Usar versão corrigida</button>
    </>}><p>Não foi possível determinar todas as posições dos acordes com segurança. Confira o conteúdo e o alinhamento.</p>
      <h3>Original</h3><pre className="paste-preview">{proposal.original}</pre>
      <h3>Corrigido</h3><pre className="paste-preview">{proposal.corrected}</pre>
    </Modal> : null}
  </>;
});
