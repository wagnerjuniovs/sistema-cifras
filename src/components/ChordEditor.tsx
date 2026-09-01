import { useEffect, useRef } from "react";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { EditorState, RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  keymap,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { findChordRanges } from "../utils/chords";

interface ChordEditorProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
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

export function ChordEditor({ value, onChange, ariaLabel }: ChordEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!hostRef.current) {
      return undefined;
    }

    const state = EditorState.create({
      doc: value,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        chordHighlighter,
        editorTheme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
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
    });
  }, [value]);

  return <div className="chord-editor" ref={hostRef} />;
}
