export interface PresentationLayout {
  columns: string[][];
  columnCount: number;
  fontSize: number;
  lineHeight: number;
  gap: number;
  needsScroll: boolean;
}

const SECTION_START = /^\s*(?:\[)?\s*(intro|introducao|introdução|verso|estrofe|refrão|refrao|pré-refrão|pre-refrão|ponte|coro|solo|final|interlúdio|interludio|parte|tom)\b/i;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function splitLinesIntoColumns(lines: string[], columnCount: number): string[][] {
  if (columnCount <= 1) {
    return [lines];
  }

  const columns: string[][] = [];
  let start = 0;

  for (let index = 0; index < columnCount - 1; index += 1) {
    const remainingColumns = columnCount - index;
    const remainingLines = lines.length - start;
    const target = start + Math.ceil(remainingLines / remainingColumns);
    const min = Math.max(start + 1, target - 8);
    const max = Math.min(lines.length - (remainingColumns - 1), target + 8);
    let selected = clamp(target, min, max);

    for (let position = target; position <= max; position += 1) {
      if (lines[position]?.trim() === "") {
        selected = position + 1;
        break;
      }
    }

    if (selected === target) {
      for (let position = target; position >= min; position -= 1) {
        if (lines[position]?.trim() === "") {
          selected = position + 1;
          break;
        }
      }
    }

    if (selected === target) {
      for (let position = target; position <= max; position += 1) {
        if (SECTION_START.test(lines[position] ?? "")) {
          selected = position;
          break;
        }
      }
    }

    columns.push(lines.slice(start, selected));
    start = selected;
  }

  columns.push(lines.slice(start));
  return columns;
}

function longestLine(columns: string[][]): number {
  return columns.reduce(
    (longest, column) => Math.max(longest, ...column.map((line) => line.length)),
    0,
  );
}

function tallestColumn(columns: string[][]): number {
  return columns.reduce((tallest, column) => Math.max(tallest, column.length), 0);
}

export function calculatePresentationLayout(
  content: string,
  viewportWidth: number,
  viewportHeight: number,
  fontOffset = 0,
): PresentationLayout {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const padding = viewportWidth < 760 ? 24 : 56;
  const usableWidth = Math.max(260, viewportWidth - padding * 2);
  const usableHeight = Math.max(260, viewportHeight - padding * 2);
  const maxColumns = clamp(Math.floor(usableWidth / 230), 1, 6);
  const gap = viewportWidth < 900 ? 20 : 30;
  let best: PresentationLayout | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let columnCount = 1; columnCount <= maxColumns; columnCount += 1) {
    const columns = splitLinesIntoColumns(lines, columnCount);
    const columnWidth = (usableWidth - gap * (columnCount - 1)) / columnCount;

    for (let fontSize = 26; fontSize >= 11; fontSize -= 1) {
      const lineHeight = Math.round(fontSize * 1.22);
      const charWidth = fontSize * 0.58;
      const widthOk = longestLine(columns) * charWidth <= columnWidth;
      const heightOk = tallestColumn(columns) * lineHeight <= usableHeight;
      const score =
        fontSize * 100 +
        (heightOk ? 300 : 0) +
        (widthOk ? 300 : 0) -
        columnCount * 18 -
        Math.max(0, longestLine(columns) * charWidth - columnWidth) * 0.4 -
        Math.max(0, tallestColumn(columns) * lineHeight - usableHeight) * 0.8;

      if (heightOk && widthOk) {
        const adjustedFont = clamp(fontSize + fontOffset, 9, 34);
        const adjustedLineHeight = Math.round(adjustedFont * 1.22);

        return {
          columns,
          columnCount,
          fontSize: adjustedFont,
          lineHeight: adjustedLineHeight,
          gap,
          needsScroll:
            longestLine(columns) * adjustedFont * 0.58 > columnWidth ||
            tallestColumn(columns) * adjustedLineHeight > usableHeight,
        };
      }

      if (score > bestScore) {
        const adjustedFont = clamp(fontSize + fontOffset, 9, 34);
        const adjustedLineHeight = Math.round(adjustedFont * 1.22);
        bestScore = score;
        best = {
          columns,
          columnCount,
          fontSize: adjustedFont,
          lineHeight: adjustedLineHeight,
          gap,
          needsScroll:
            longestLine(columns) * adjustedFont * 0.58 > columnWidth ||
            tallestColumn(columns) * adjustedLineHeight > usableHeight,
        };
      }
    }
  }

  return (
    best ?? {
      columns: [lines],
      columnCount: 1,
      fontSize: clamp(18 + fontOffset, 9, 34),
      lineHeight: clamp(22 + fontOffset, 12, 42),
      gap,
      needsScroll: true,
    }
  );
}
