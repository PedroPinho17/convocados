import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameRatings } from "./game-ratings";
import { game, player, PLAYER } from "@/test/factories";

const api = vi.hoisted(() => ({ listMyRatings: vi.fn(), upsertRating: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  ...api,
}));

beforeEach(() => {
  vi.clearAllMocks();
  api.listMyRatings.mockResolvedValue([]);
});

const rating = (toUserId: string, toUserName: string, score: number) => ({
  id: `r-${toUserId}`,
  gameId: "g1",
  fromUserId: PLAYER.id,
  toUserId,
  toUserName,
  score,
  createdAt: "2030-01-01T10:00:00.000Z",
});

describe("GameRatings", () => {
  it("quem não está confirmado não avalia (nem pede as avaliações)", () => {
    const g = game({ participations: [player("a", "Rui"), player(PLAYER.id, "Ana", "waiting")] });
    const { container } = render(<GameRatings game={g} me={PLAYER} />);
    expect(container).toBeEmptyDOMElement();
    expect(api.listMyRatings).not.toHaveBeenCalled();
  });

  it("confirmado: avalia os outros, nunca a si próprio, e vê as notas que já deu", async () => {
    api.listMyRatings.mockResolvedValue([rating("a", "Rui", 4)]);
    const g = game({ participations: [player("a", "Rui"), player(PLAYER.id, "Ana")] });
    render(<GameRatings game={g} me={PLAYER} />);

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("Rui");
    // A nota já dada fica destacada.
    const four = await within(rows[0]!).findByRole("button", { name: "4" });
    await vi.waitFor(() => expect(four.className).toMatch(/bg-zinc-900/));
  });

  it("dar uma nota chama a API com o jogador e a nota", async () => {
    api.upsertRating.mockResolvedValue(rating("a", "Rui", 5));
    const g = game({ participations: [player("a", "Rui"), player(PLAYER.id, "Ana")] });
    render(<GameRatings game={g} me={PLAYER} />);

    await userEvent.click(await screen.findByRole("button", { name: "5" }));
    expect(api.upsertRating).toHaveBeenCalledWith("g1", { toUserId: "a", score: 5 });
  });
});
