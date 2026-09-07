// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractCifraClubChordText as extract, repairMalformedCifraClubText as repair } from "./cifraClubCleaner";
const fixture = readFileSync("tests/fixtures/cifra-club.html", "utf8");
describe("extração estruturada", () => {
  it("ignora menus, outros pre e scripts Next e preserva tom visível, espaços, blocos e tabs", () => {
    const result = extract(fixture);
    expect(result.recognized).toBe(true);
    expect(result.content).toBe("[Intro] Am\n            Em\nLinha fictícia da música\n        E/G#\nOutra linha fictícia\ne|--0--2--|\nB|--1-----|");
    expect(result.content.match(/Linha fictícia/g)).toHaveLength(1);
  });
  it("seleciona um único candidato coerente", () => {
    expect(extract('<pre data-chord-content="true">ruído</pre>'+fixture).content).toContain("[Intro]");
    expect(extract('<pre data-chord-content="true">ruído</pre>'+fixture).content).not.toContain("ruído");
  });
  it("aceita seleção parcial sem pre", () => {
    expect(extract('<div class="kvMV">   <b data-chord-name="Bm">Bm</b><br>Canção!</div>').content).toBe("   Bm\nCanção!");
    expect(extract('  <b data-chord-name="A">A</b> letra').content).toBe("  A letra");
  });
  it("usa atributos apenas se o acorde não tem texto", () => {
    expect(extract('<b data-chord-name="Dm" data-chord-original-text="Am"></b>').content).toBe("Dm");
    expect(extract('<b data-chord-name="" data-chord-original-text="Am"></b>').content).toBe("Am");
  });
  it("rejeita HTML sem estrutura reconhecida e não executa recursos", () => {
    expect(extract('<pre>A\nLetra</pre>').recognized).toBe(false);
    expect(extract('<b data-chord-name="A">A</b><img src="https://example.com/pixel" onerror="window.bad=true">').content).toBe("A");
  });
});
describe("reparo conservador", () => {
  it.each(['A','Bm','C#m','E/G#','A/D','Bbmaj7','Cm7','Ddim','Eaug','Fsus2','Gsus4','Aadd9','C7(b5)','(F#m7)'])('repara %s sem mover os espaços', (chord) => {
    const result=repair('            ">'+chord);
    expect(result.content).toBe('            '+chord);
    expect(result.confidence).toBe('high');
    expect(repair(result.content).content).toBe(result.content);
  });
  it("repara vários acordes e negrito musical, preservando frases", () => {
    expect(repair('  ">A ">Bm ">E/G#\n            **Am**\n**Uma frase**').content).toBe('  A Bm E/G#\n            Am\n**Uma frase**');
  });
  it("deduplica somente o entorno comprovadamente corrompido com revisão", () => {
    const result=repair('Canção, sim!\n  ">A\nCanção, sim!');
    expect(result.content).toBe('  A\nCanção, sim!');
    expect(result.confidence).toBe('low');
  });
  it("não inventa posições para acorde colado na letra", () => {
    const result=repair('\">AQuando eu canto');
    expect(result.confidence).toBe('low');
    expect(result.content).toBe('AQuando eu canto');
  });
  it("preserva refrões repetidos, acentos, pontuação e conteúdo limpo byte a byte", () => {
    const chorus='[Refrão]\r\n    Am   E/G#  \r\nCanção, coração!\r\n\r\n';
    expect(repair(chorus+chorus).content).toBe(chorus+chorus);
    expect(repair('\">A\n'+chorus+chorus).content).toBe('A\n'+chorus+chorus);
  });
});
