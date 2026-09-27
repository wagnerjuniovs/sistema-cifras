import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ addDoc: vi.fn(), updateDoc: vi.fn(), onSnapshot: vi.fn() }));
vi.mock("../lib/firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  ...mocks,
  collection: (_db: unknown, ...path: string[]) => path.join("/"),
  doc: (_db: unknown, ...path: string[]) => path.join("/"),
  serverTimestamp: () => "timestamp",
  deleteDoc: vi.fn(), writeBatch: vi.fn(),
}));
import { createSong, setSongStatus, subscribeLibrary, updateSong } from "./firestore";

describe("status das cifras", () => {
  beforeEach(() => vi.clearAllMocks());
  it("carrega cifras antigas como pendentes e mantém as prontas", () => {
    mocks.onSnapshot.mockImplementation((path, callback) => {
      callback({ docs: path.endsWith("songs") ? [
        { id: "antiga", data: () => ({ title: "Antiga" }) },
        { id: "revisada", data: () => ({ title: "Revisada", status: "ready" }) },
      ] : [] });
      return vi.fn();
    });
    const changed = vi.fn();
    subscribeLibrary("user", changed, vi.fn());
    expect(changed.mock.calls[0][0].songs.map((song: { status: string }) => song.status)).toEqual(["pending", "ready"]);
  });
  it("cria novas cifras pendentes ou prontas conforme a escolha", async () => {
    mocks.addDoc.mockResolvedValue({ id: "nova" });
    const input = { title: "Nova", artist: "", content: "C G", folderId: null };
    await createSong("user", input);
    expect(mocks.addDoc.mock.calls[0][1].status).toBe("pending");
    await createSong("user", { ...input, status: "ready" });
    expect(mocks.addDoc.mock.calls[1][1].status).toBe("ready");
  });
  it("altera somente o status e a data, preservando o conteúdo antigo", async () => {
    await setSongStatus("user", "antiga", "ready");
    expect(mocks.updateDoc).toHaveBeenLastCalledWith("users/user/songs/antiga", { status: "ready", updatedAt: "timestamp" });
    await setSongStatus("user", "antiga", "pending");
    expect(mocks.updateDoc).toHaveBeenLastCalledWith("users/user/songs/antiga", { status: "pending", updatedAt: "timestamp" });
  });
  it("salva o status selecionado no editor e preserva o existente quando omitido", async () => {
    const input = { title: "Nova", artist: "", content: "C G", folderId: null };
    await updateSong("user", "antiga", { ...input, status: "ready" });
    expect(mocks.updateDoc.mock.calls[0][1].status).toBe("ready");
    await updateSong("user", "antiga", input);
    expect(mocks.updateDoc.mock.calls[1][1]).not.toHaveProperty("status");
  });
});
