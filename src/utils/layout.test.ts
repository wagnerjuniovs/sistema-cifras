import { describe, expect, it } from "vitest";
import { calculatePresentationLayout, musicalBlocks, wrapMusicalBlock } from "./layout";

describe("layout de apresentação", () => {
  it("preserva a ordem das linhas ao dividir em colunas", () => {
    const content = [
      "Intro: C G Am F",
      "",
      "Verso",
      "C              G",
      "Linha cantada aqui",
      "Am             F",
      "Outra linha",
      "",
      "Refrão",
      "F              C",
      "Mais uma linha",
    ].join("\n");
    const layout = calculatePresentationLayout(content, 1366, 768);

    expect(layout.columnCount).toBeGreaterThanOrEqual(1);
    expect(layout.fontSize).toBeGreaterThan(0);
    expect(layout.columns.flat().join("\n")).toBe(content);
  });
});

it("mantém título, acorde e letra juntos e tablatura completa", () => {
  const blocks = musicalBlocks('[Refrão]\n   Am   G\nCanção!\ne|--0--|\nB|--1--|\n\n   Dm\nFinal!');
  expect(blocks[0].lines).toEqual(['[Refrão]','   Am   G','Canção!']);
  expect(blocks[1].lines).toEqual(['e|--0--|','B|--1--|']);
  expect(blocks.flatMap(block=>block.lines).join('\n')).toContain('   Dm\nFinal!');
});
it("usa alturas medidas em vez de contar linhas", () => {
  const content=Array.from({length:20},(_,i)=>`[Parte ${i}]\nAm\nVerso ${i}`).join('\n');
  const measure=(lines:string[],font:number)=>({width:lines.length===1&&lines[0]==='M'?10:250,height:lines.length*100});
  const layout=calculatePresentationLayout(content,1200,400,0,measure);
  expect(layout.needsScroll).toBe(true);
  expect(layout.fontSize).toBeGreaterThanOrEqual(14);
  expect(layout.blocks.flat().flatMap(block=>block.lines).join('\n')).toBe(content);
});
it("quebra acordes e letra no mesmo índice sem cortar inversões", () => {
  const source={id:0,lines:['  Am       E/G#             Dm','Uma frase longa para cantar aqui']};
  const wrapped=wrapMusicalBlock(source,14);
  expect(wrapped.lines.every(line=>line.length<=14)).toBe(true);
  expect(wrapped.lines.filter((_,i)=>i%2===0).join('')).toBe(source.lines[0]);
  expect(wrapped.lines.filter((_,i)=>i%2===1).join('')).toBe(source.lines[1]);
  expect(wrapped.lines.some(line=>line.includes('E/G#'))).toBe(true);
});
it("expande tabulações em posições monoespaçadas", () => {
  expect(musicalBlocks('A\tB\tC')[0].lines[0]).toBe('A   B   C');
});
