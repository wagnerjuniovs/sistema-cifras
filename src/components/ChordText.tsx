import { Fragment } from "react";
import { findChordRanges } from "../utils/chords";

interface ChordTextProps {
  content: string;
}

function renderLine(line: string, lineIndex: number) {
  const ranges = findChordRanges(line);

  if (ranges.length === 0) {
    return line;
  }

  const parts = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start > cursor) {
      parts.push(line.slice(cursor, range.start));
    }

    parts.push(
      <span className="chord-token" key={`${lineIndex}-${range.start}-${range.end}`}>
        {line.slice(range.start, range.end)}
      </span>,
    );
    cursor = range.end;
  }

  if (cursor < line.length) {
    parts.push(line.slice(cursor));
  }

  return parts;
}

export function ChordText({ content }: ChordTextProps) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");

  return (
    <>
      {lines.map((line, index) => (
        <Fragment key={`${index}-${line}`}>
          {renderLine(line, index)}
          {index < lines.length - 1 ? "\n" : null}
        </Fragment>
      ))}
    </>
  );
}
