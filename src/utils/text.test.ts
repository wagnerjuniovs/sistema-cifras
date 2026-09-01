import { describe, expect, it } from "vitest";
import type { FolderDoc } from "../types";
import {
  getDescendantFolderIds,
  getFolderPathLabel,
  normalizeForSearch,
  sortFolders,
  wouldCreateFolderCycle,
} from "./text";

function folder(id: string, name: string, parentId: string | null = null): FolderDoc {
  return {
    id,
    name,
    parentId,
    createdAt: null,
    updatedAt: null,
  };
}

describe("utilitários de texto e pastas", () => {
  const folders = [
    folder("sertanejo", "Sertanejo"),
    folder("zeze", "Zezé Di Camargo e Luciano", "sertanejo"),
    folder("amor", "É o Amor", "zeze"),
    folder("religiosa", "Música religiosa"),
  ];

  it("normaliza acentos e maiúsculas para pesquisa", () => {
    expect(normalizeForSearch("É o Amor")).toBe("e o amor");
    expect(normalizeForSearch("MÚSICA religiosa")).toBe("musica religiosa");
  });

  it("ordena em português ignorando acentos e caixa", () => {
    const sorted = sortFolders([
      folder("b", "Água"),
      folder("c", "amor"),
      folder("a", "Zebra"),
    ]);

    expect(sorted.map((item) => item.name)).toEqual(["Água", "amor", "Zebra"]);
  });

  it("monta o caminho completo de uma pasta", () => {
    expect(getFolderPathLabel("amor", folders)).toBe(
      "Início / Sertanejo / Zezé Di Camargo e Luciano / É o Amor",
    );
  });

  it("lista descendentes para exclusão em cascata", () => {
    expect(getDescendantFolderIds("sertanejo", folders).sort()).toEqual(["amor", "zeze"]);
  });

  it("bloqueia ciclos ao mover pastas", () => {
    expect(wouldCreateFolderCycle("sertanejo", "amor", folders)).toBe(true);
    expect(wouldCreateFolderCycle("zeze", "religiosa", folders)).toBe(false);
  });
});
