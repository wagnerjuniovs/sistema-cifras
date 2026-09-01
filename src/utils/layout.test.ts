import { describe, expect, it } from "vitest";
import { calculatePresentationLayout } from "./layout";

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
