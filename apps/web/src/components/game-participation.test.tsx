import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameParticipation } from "./game-participation";
import { game, ORGANIZER, player, PLAYER } from "@/test/factories";

const api = vi.hoisted(() => ({
  confirmGame: vi.fn(),
  leaveGame: vi.fn(),
  setPaid: vi.fn(),
}));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  ...api,
}));

const onChange = vi.fn();
const show = (g = game(), me: typeof PLAYER | null = PLAYER) =>
  render(<GameParticipation game={g} me={me} loginNext="/i/abcdef123456" onChange={onChange} />);

beforeEach(() => vi.clearAllMocks());

describe("GameParticipation", () => {
  it("sem sessão: pede para entrar e volta ao convite depois", () => {
    show(game(), null);
    const link = screen.getByRole("link", { name: "Entra ou cria conta" });
    expect(link).toHaveAttribute("href", "/login?next=%2Fi%2Fabcdef123456");
    expect(screen.queryByRole("button", { name: "Confirmar" })).not.toBeInTheDocument();
  });

  it("com vagas: confirmar chama a API e atualiza o jogo", async () => {
    const updated = game({ participations: [player(PLAYER.id, "Ana")] });
    api.confirmGame.mockResolvedValue(updated);
    show();

    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(api.confirmGame).toHaveBeenCalledWith("g1");
    expect(onChange).toHaveBeenCalledWith(updated);
  });

  it("na página do convite: confirmar e desistir levam o código (dá acesso a quem ainda não está no jogo)", async () => {
    const confirmed = game({ participations: [player(PLAYER.id, "Ana")] });
    api.confirmGame.mockResolvedValue(confirmed);
    api.leaveGame.mockResolvedValue(game());
    const { rerender } = render(
      <GameParticipation game={game()} me={PLAYER} loginNext="/i/abcdef123456" inviteCode="abcdef123456" onChange={onChange} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(api.confirmGame).toHaveBeenCalledWith("g1", "abcdef123456");

    rerender(
      <GameParticipation game={confirmed} me={PLAYER} loginNext="/i/abcdef123456" inviteCode="abcdef123456" onChange={onChange} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Desistir" }));
    expect(api.leaveGame).toHaveBeenCalledWith("g1", "abcdef123456");
  });

  it("vagas cheias mas há lugar na espera: entra na lista de espera", () => {
    const full = ["a", "b", "c", "d"].map((id) => player(id, id.toUpperCase()));
    show(game({ participations: full }));
    expect(screen.getByRole("button", { name: "Entrar na lista de espera" })).toBeEnabled();
  });

  it("vagas e espera cheias: não deixa confirmar", () => {
    const people = [
      ...["a", "b", "c", "d"].map((id) => player(id, id)),
      player("e", "e", "waiting"),
      player("f", "f", "waiting"),
    ];
    show(game({ participations: people }));
    expect(screen.getByRole("button", { name: "Jogo cheio" })).toBeDisabled();
  });

  it("jogo que já começou: não deixa confirmar", () => {
    show(game({ startsAt: "2020-01-01T21:00:00.000Z" }));
    expect(screen.getByRole("button", { name: "Jogo já começou" })).toBeDisabled();
  });

  it("confirmado: mostra o pagamento em falta e deixa desistir", async () => {
    api.leaveGame.mockResolvedValue(game());
    show(game({ participations: [player(PLAYER.id, "Ana")] }));

    expect(screen.getByText(/pagamento em falta/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Desistir" }));
    expect(api.leaveGame).toHaveBeenCalledWith("g1");
  });

  it("em espera: mostra o lugar na fila", () => {
    const people = [
      ...["a", "b", "c", "d"].map((id) => player(id, id)),
      player("e", "e", "waiting"),
      player(PLAYER.id, "Ana", "waiting"),
    ];
    show(game({ participations: people }));
    expect(screen.getByText(/Entras se alguém desistir/)).toHaveTextContent("(2.º)");
  });

  it("mostra quem pagou e quanto falta (divisão pelos confirmados)", () => {
    show(
      game({
        participations: [player("a", "Rui", "confirmed", { paid: true }), player("b", "Tó")],
      }),
    );
    // 30 € ÷ 2 = 15 € cada; falta o do Tó.
    expect(screen.getByText(/Pagamentos: 1\/2/).textContent?.replace(/\s/g, " ")).toMatch(
      /falta 15,00 €/,
    );
  });

  it("só o organizador vê os botões de pagamento", async () => {
    const g = game({ participations: [player(PLAYER.id, "Ana")] });
    api.setPaid.mockResolvedValue(g);

    const { unmount } = show(g, PLAYER);
    expect(screen.queryByRole("button", { name: "Marcar pago" })).not.toBeInTheDocument();
    unmount();

    show(g, ORGANIZER);
    const row = screen.getAllByRole("listitem").find((li) => li.textContent?.includes("Ana"))!;
    await userEvent.click(within(row).getByRole("button", { name: "Marcar pago" }));
    expect(api.setPaid).toHaveBeenCalledWith("g1", PLAYER.id, true);
  });

  it("mostra o erro da API", async () => {
    const { ApiError } = await import("@/lib/api");
    api.confirmGame.mockRejectedValue(new ApiError("Jogo cheio (vagas e lista de espera).", 409));
    show();

    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByText("Jogo cheio (vagas e lista de espera).")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
