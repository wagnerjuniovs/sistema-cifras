import { isChordToken, isChordLine } from "./chords";

export interface CifraClubCleanResult {
  content: string;
  changed: boolean;
  confidence: "high" | "low";
  removedFragments: number;
  removedDuplicateBlocks: number;
}
export interface ExtractionResult { content: string; recognized: boolean }
const AUXILIARY = 'script,style,link,iframe,object,embed,img,svg,canvas,button,nav,aside,select,textarea,template,[hidden],[aria-hidden="true"],[role="menu"],[data-ad],.ads,.advertisement,.diagram,.diagrams,.chord-diagram';

/** Parse in an inert template: copied resources and handlers never enter the live DOM. */
export function extractCifraClubChordText(html: string): ExtractionResult {
  const empty = { content: "", recognized: false };
  if (!html || typeof DOMParser === "undefined") return empty;
  const doc = new DOMParser().parseFromString("<!doctype html><html><body></body></html>", "text/html");
  const template = doc.createElement("template");
  template.innerHTML = html;
  const root = template.content;
  root.querySelectorAll(AUXILIARY).forEach((node) => node.remove());
  let candidates: Element[] = [...root.querySelectorAll('pre[data-chord-content="true"]')];
  if (!candidates.length) {
    if (/<(?:html|body)[\s>]/i.test(html) || root.querySelector("header,footer,main") || !root.querySelector('b[data-chord-name],.kvMV,.tabs')) return empty;
    const wrapper = doc.createElement("div");
    wrapper.append(root.cloneNode(true));
    candidates = [wrapper];
  }
  const serialize = (node: Node): string => {
    if (node.nodeType === 3) return node.nodeValue ?? "";
    if (node.nodeType !== 1) return "";
    const element = node as Element;
    if (element.matches(AUXILIARY)) return "";
    if (element.tagName === "BR") return "\n";
    if (element.matches("b[data-chord-name]")) {
      return element.textContent?.trim() || element.getAttribute("data-chord-name") || element.getAttribute("data-chord-original-text") || "";
    }
    let text = "";
    let previousBlock = false;
    for (const child of element.childNodes) {
      const block = child.nodeType === 1 && (child as Element).matches("div,p,pre");
      const value = serialize(child);
      if ((block || previousBlock) && text && value && !text.endsWith("\n") && !value.startsWith("\n")) text += "\n";
      text += value;
      if (value) previousBlock = block;
    }
    return text;
  };
  const ranked = candidates.map((candidate) => {
    const content = serialize(candidate.cloneNode(true)).replace(/\r\n?/g, "\n")
      .replace(/\u00a0/g, " ").replace(/[\u200b-\u200d\ufeff]/g, "")
      .replace(/[ \t]+$/gm, "").replace(/\n{4,}/g, "\n\n\n");
    return { content, score: candidate.querySelectorAll("b[data-chord-name]").length * 20 +
      (content.match(/\[[^\]\n]+\]/g)?.length ?? 0) * 5 + content.split("\n").filter((line) => line.trim()).length };
  }).filter(({ content }) => content.trim() && !content.includes("self.__next_f.push"));
  ranked.sort((a, b) => b.score - a.score);
  return ranked.length ? { content: ranked[0].content, recognized: true } : empty;
}

/** Ambiguous positions are never invented; the editor asks for review. */
export function repairMalformedCifraClubText(content: string): CifraClubCleanResult {
  let removedFragments = 0;
  let removedDuplicateBlocks = 0;
  let confidence: "high" | "low" = "high";
  const source = content.split("\n");
  const output: string[] = [];
  for (let i = 0; i < source.length; i += 1) {
    const original = source[i];
    let line = original.replace(/\*\*([^*\n]+)\*\*/g, (whole, chord: string) => {
      if (!isChordToken(chord)) return whole;
      removedFragments += 1;
      return chord;
    });
    const fixed = line.replace(/">(\S+)/g, (whole, token: string) => {
      if (!isChordToken(token)) {
        // Glued lyrics have lost their original coordinates. Preserve all text in a review-only proposal.
        for (let end = token.length - 1; end > 0; end--) {
          if (isChordToken(token.slice(0, end)) && /^[\p{Lu}]/u.test(token.slice(end))) {
            confidence = "low";
            removedFragments += 1;
            return token;
          }
        }
        return whole;
      }
      removedFragments += 1;
      return token;
    });
    if (fixed !== line && !isChordLine(fixed)) confidence = "low";
    line = fixed;
    if (line.includes('\">')) confidence = "low";
    // Exact verse / broken chord / same verse supplies local evidence only.
    if (original.includes('\">') && line !== original && isChordLine(line) &&
        i > 0 && source[i - 1].trim() && source[i - 1] === source[i + 1] && !isChordLine(source[i - 1])) {
      output.pop();
      output.push(line, source[i + 1]);
      i += 1;
      removedDuplicateBlocks += 1;
      confidence = "low";
    } else output.push(line);
  }
  const result = output.join("\n");
  return { content: result, changed: result !== content, confidence, removedFragments, removedDuplicateBlocks };
}
export const cleanCifraClubPaste = repairMalformedCifraClubText;
