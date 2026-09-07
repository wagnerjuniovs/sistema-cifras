import { isChordLine, findChordRanges } from "./chords";

export interface MusicalBlock { id: number; lines: string[] }
export interface PresentationLayout {
  columns: string[][];
  blocks: MusicalBlock[][];
  columnCount: number;
  fontSize: number;
  lineHeight: number;
  gap: number;
  needsScroll: boolean;
}
const section = (line: string) => /^\s*\[[^\]]+\]/.test(line);
const tab = (line: string) => /^\s*[eBGDAEbgdae]?\|[-\d|hpsbr~x/\\(). ]+/.test(line);

export function musicalBlocks(content: string): MusicalBlock[] {
  const lines = content.replace(/\r\n?/g, "\n").split("\n").map((line) => {
    let expanded = "";
    for (const char of line) expanded += char === "\t" ? " ".repeat(4 - expanded.length % 4) : char;
    return expanded;
  });
  const blocks: MusicalBlock[] = [];
  for (let i = 0; i < lines.length;) {
    const start = i;
    if (section(lines[i])) {
      i++;
      while (i < lines.length && !lines[i].trim()) i++;
    }
    if (i < lines.length && tab(lines[i])) {
      while (i < lines.length && tab(lines[i])) i++;
    } else {
      while (i < lines.length && isChordLine(lines[i]) && !section(lines[i])) i++;
      if (i < lines.length && !section(lines[i])) i++;
    }
    if (i === start) i++;
    blocks.push({ id: start, lines: lines.slice(start, i) });
  }
  return blocks;
}

/** Slice chord/lyric groups at shared columns, preferring word boundaries. */
export function wrapMusicalBlock(block: MusicalBlock, capacity: number): MusicalBlock {
  const lines: string[] = [];
  // Section labels are independent of the chord/lyric coordinates.
  let source = block.lines;
  if (source.length > 1 && section(source[0]) && !isChordLine(source[0])) {
    lines.push(...wrapMusicalBlock({ id: block.id, lines: [source[0]] }, capacity).lines);
    source = source.slice(1);
  }
  let start = 0;
  const length = Math.max(...source.map((line) => line.length), 0);
  while (start < length) {
    let end = Math.min(length, start + Math.max(1, capacity));
    if (end < length) {
      // A shared whitespace boundary does not bisect an accord or a word in either line.
      for (let candidate = end; candidate > start + capacity / 2; candidate--) {
        if (source.every((line) => candidate >= line.length || /\s/.test(line[candidate - 1]) || /\s/.test(line[candidate]))) {
          end = candidate;
          break;
        }
      }
    }
    for (const line of source) {
      for (const range of findChordRanges(line)) {
        if (range.start < end && range.end > end && range.start > start) end = range.start;
      }
    }
    lines.push(...source.map((line) => line.slice(start, end)));
    start = end;
  }
  return { ...block, lines: lines.length ? lines : source };
}

type Measure = (lines: string[], font: number, width?: number) => { width: number; height: number };

function distribute(blocks: MusicalBlock[], heights: number[], count: number): { blocks: MusicalBlock[][]; height: number } {
  let low = Math.max(...heights, 0);
  let high = heights.reduce((a, b) => a + b, 0);
  const partition = (limit: number) => {
    const columns: MusicalBlock[][] = [[]];
    let height = 0;
    for (let i = 0; i < blocks.length; i++) {
      if (height && height + heights[i] > limit + 0.1) { columns.push([]); height = 0; }
      columns[columns.length - 1].push(blocks[i]);
      height += heights[i];
    }
    return columns;
  };
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    if (partition(mid).length <= count) high = mid; else low = mid;
  }
  return { blocks: partition(high), height: high };
}

export function calculatePresentationLayout(content: string, width: number, height: number, fontOffset = 0,
  measure: Measure = (lines, font) => ({ width: Math.max(...lines.map((line) => line.length), 0) * font * 0.62, height: lines.length * font * 1.35 }),
  allowColumns = true): PresentationLayout {
  const original = musicalBlocks(content);
  const gap = 28;
  const preferred = Math.min(32, Math.max(14, 22 + fontOffset));
  let fallback: PresentationLayout | undefined;
  for (let font = preferred; font >= Math.max(14, 14 + fontOffset); font--) {
    const character = measure(["M"], font).width;
    const naturalWidth = measure(original.flatMap((block) => block.lines), font).width;
    const maxColumns = allowColumns ? Math.max(1, Math.min(original.length, Math.floor((width + gap) / (Math.max(280, naturalWidth + 2) + gap)))) : 1;
    const columnWidth = (width - gap * (maxColumns - 1)) / maxColumns;
    const capacity = Math.max(1, Math.floor((columnWidth - 2) / character));
    const wrapped = original.map((block) => wrapMusicalBlock(block, capacity));
    const heights = wrapped.map((block) => measure(block.lines, font, columnWidth).height);
    const partition = distribute(wrapped, heights, maxColumns);
    const result = { blocks: partition.blocks, columns: partition.blocks.map((column) => column.flatMap((block) => block.lines)),
      columnCount: partition.blocks.length, fontSize: font, lineHeight: font * 1.35, gap, needsScroll: partition.height > height + 1 };
    if (!result.needsScroll) return result;
    fallback = result;
  }
  return fallback!;
}
