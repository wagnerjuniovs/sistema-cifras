import { describe, expect, it } from "vitest";
import { findChordRanges, isChordToken } from "./chords";

function highlighted(line: string) {
  return findChordRanges(line).map((range) => line.slice(range.start, range.end));
}

describe("detecção de acordes", () => {
  it("reconhece acordes simples e complexos em linhas de cifra", () => {
    expect(highlighted("Intro: Cadd9 Gsus4 Am7 D/F#")).toEqual(["Cadd9", "Gsus4", "Am7", "D/F#"]);
  });

  it("reconhece sustenidos, bemóis e inversões", () => {
    expect(highlighted("F# Bbm Eb7M G/B C/E")).toEqual(["F#", "Bbm", "Eb7M", "G/B", "C/E"]);
  });

  it("destaca acordes entre colchetes no meio da letra", () => {
    expect(highlighted("Eu vou [C]cantar com [G/B]alegria")).toEqual(["[C]", "[G/B]"]);
  });

  it("não trata palavras comuns como acordes em linhas de letra", () => {
    expect(highlighted("A casa está cheia de amor")).toEqual([]);
  });

  it("valida tokens musicais comuns", () => {
    expect(isChordToken("Cmaj7")).toBe(true);
    expect(isChordToken("Dm7")).toBe(true);
    expect(isChordToken("Gsus4")).toBe(true);
    expect(isChordToken("Amanhecer")).toBe(false);
  });
});

it("destaca extensões entre parênteses sem aceitar frases", () => {
  expect(highlighted("C7(b5) (Am) E/G#")).toEqual(["C7(b5)", "(Am)", "E/G#"]);
  expect(isChordToken("C(frase)")).toBe(false);
});
