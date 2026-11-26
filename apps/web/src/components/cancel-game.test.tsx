import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CancelGame } from "./cancel-game";
import { GameParticipation } from "./game-participation";
import { game, player, PLAYER } from "@/test/factories";

const api = vi.hoisted(() => ({ cancelGame: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  ...api,
}));

const onChange = vi.fn();
beforeEach(() => vi.clearAllMocks());

describe("CancelGame", () => {
  const withPeople = game({ participations: [player("a", "Rui"), player("b", "Tó", "waiting")] });

  it("pede confirmação a dizer quantas pessoas são avisadas, e cancela", async () => {
    const cancelled = { ...withPeople, status: "cancelled" as const };
    api.cancelGame.mockResolvedValue(cancelled);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<CancelGame game={withPeople} onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Cancelar jogo" }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("As 2 pessoas inscritas"));
    expect(api.cancelGame).toHaveBeenCalledWith("g1");
    expect(onChange).toHaveBeenCalledWith(cancelled);
  });

  it("se disser que não, não cancela", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<CancelGame game={withPeople} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancelar jogo" }));
    expect(api.cancelGame).not.toHaveBeenCalled();
  });

  it("num jogo cancelado já não se pode confirmar", () => {
    render(
      <GameParticipation
        game={game({ status: "cancelled" })}
        me={PLAYER}
        loginNext="/games/g1"
        onChange={onChange}
      />,
    );
    expect(screen.getByRole("button", { name: "Jogo cancelado" })).toBeDisabled();
  });
});
