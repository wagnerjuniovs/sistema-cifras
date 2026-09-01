export interface TextRange {
  start: number;
  end: number;
}

const ROOT = String.raw`[A-G](?:#|b)?`;
const SUFFIX = String.raw`(?:(?:maj|min|dim|aug|sus|add|alt|m|M|º|°|ø|\+|-|\d+|[#b]\d+|\([^\s\]]+\))*)`;
const CHORD_CORE = String.raw`${ROOT}${SUFFIX}(?:/${ROOT})?`;
const BRACKET_CHORD = new RegExp(String.raw`\[${CHORD_CORE}\]`, "g");
const CHORD_TOKEN = new RegExp(String.raw`^${CHORD_CORE}$`);

const SECTION_TOKENS = new Set([
  "intro",
  "introducao",
  "verso",
  "estrofe",
  "refrao",
  "pre-refrao",
  "prerefrao",
  "ponte",
  "coro",
  "solo",
  "final",
  "interludio",
  "parte",
  "tom",
]);

interface TokenInfo {
  raw: string;
  clean: string;
  start: number;
  end: number;
  chord: boolean;
  section: boolean;
  separator: boolean;
}

export function isChordToken(value: string): boolean {
  return CHORD_TOKEN.test(value);
}

function normalizeToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function cleanToken(raw: string, start: number): Omit<TokenInfo, "raw" | "chord" | "section" | "separator"> {
  const leading = raw.match(/^[|([{:]+/)?.[0].length ?? 0;
  const trailing = raw.match(/[|)\]},;:.]+$/)?.[0].length ?? 0;
  const clean = raw.slice(leading, raw.length - trailing);

  return {
    clean,
    start: start + leading,
    end: start + leading + clean.length,
  };
}

function tokenize(line: string): TokenInfo[] {
  const tokens: TokenInfo[] = [];
  const matcher = /\S+/g;
  let match: RegExpExecArray | null;

  while ((match = matcher.exec(line)) !== null) {
    const raw = match[0];
    const cleaned = cleanToken(raw, match.index);
    const section = SECTION_TOKENS.has(normalizeToken(cleaned.clean.replace(/-+/g, "-")));
    const separator = /^[|:.,;/(){}\[\]-]+$/.test(raw);
    const chord = isChordToken(cleaned.clean);

    tokens.push({
      raw,
      ...cleaned,
      chord,
      section,
      separator,
    });
  }

  return tokens;
}

function isStrongChord(clean: string): boolean {
  if (/[#b/0-9º°ø()+-]/.test(clean)) {
    return true;
  }

  return /(?:maj|min|dim|aug|sus|add|alt|m|M)/.test(clean.slice(1));
}

function isPredominantlyChordLine(tokens: TokenInfo[]): boolean {
  const meaningful = tokens.filter((token) => !token.separator && !token.section && token.clean.length > 0);
  const chords = meaningful.filter((token) => token.chord);

  if (chords.length === 0) {
    return false;
  }

  if (meaningful.length === chords.length) {
    return true;
  }

  const strongChord = chords.some((token) => isStrongChord(token.clean));

  if (chords.length === 1) {
    return strongChord && meaningful.length <= 2;
  }

  return chords.length / meaningful.length >= 0.55;
}

function mergeRanges(ranges: TextRange[]): TextRange[] {
  return ranges
    .filter((range) => range.end > range.start)
    .sort((a, b) => a.start - b.start || a.end - b.end)
    .reduce<TextRange[]>((merged, range) => {
      const previous = merged[merged.length - 1];

      if (previous && range.start <= previous.end) {
        previous.end = Math.max(previous.end, range.end);
      } else {
        merged.push({ ...range });
      }

      return merged;
    }, []);
}

export function findChordRanges(line: string): TextRange[] {
  const ranges: TextRange[] = [];
  BRACKET_CHORD.lastIndex = 0;

  let bracket: RegExpExecArray | null;
  while ((bracket = BRACKET_CHORD.exec(line)) !== null) {
    ranges.push({ start: bracket.index, end: bracket.index + bracket[0].length });
  }

  const tokens = tokenize(line);

  if (isPredominantlyChordLine(tokens)) {
    for (const token of tokens) {
      if (token.chord) {
        ranges.push({ start: token.start, end: token.end });
      }
    }
  }

  return mergeRanges(ranges);
}
