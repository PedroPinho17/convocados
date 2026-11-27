import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { GameInviteDto } from "@convocados/shared";
import { InvitePreview } from "./invite-preview";

function invite(overrides: Partial<GameInviteDto> = {}): GameInviteDto {
  const players = overrides.players ?? [];
  return {
    id: "g1",
    title: "Futebolada",
    location: "Pavilhão",
    startsAt: "2030-01-10T21:00:00.000Z",
    slots: 4,
    subs: 2,
    totalPriceCents: 3000,
    status: "open",
    sport: "football",
    confirmedCount: players.filter((p) => p.status === "confirmed").length,
    waitingCount: players.filter((p) => p.status === "waiting").length,
    ...overrides,
    players,
  };
}

describe("InvitePreview (convite sem sessão)", () => {
  it("mostra vagas, quem vai e a lista de espera, por ordem", () => {
    render(
      <InvitePreview
        invite={invite({
          slots: 2,
          players: [
            { name: "Ana", status: "confirmed" },
            { name: "Rui", status: "confirmed" },
            { name: "Zé", status: "waiting" },
          ],
        })}
        loginNext="/i/abcdef123456"
      />,
    );

    expect(screen.getByRole("progressbar", { name: "Vagas preenchidas" })).toHaveAttribute(
      "aria-valuenow",
      "2",
    );
    expect(screen.getByText("1. Ana")).toBeInTheDocument();
    expect(screen.getByText("2. Rui")).toBeInTheDocument();
    expect(screen.getByText("1. Zé")).toBeInTheDocument();
    expect(screen.getByText("1/2 em lista de espera")).toBeInTheDocument();
  });

  it("pede para entrar, volta ao convite, e não mostra pagamentos", () => {
    render(<InvitePreview invite={invite({ players: [{ name: "Ana", status: "confirmed" }] })} loginNext="/i/abcdef123456" />);

    expect(screen.getByRole("link", { name: "Entra ou cria conta" })).toHaveAttribute(
      "href",
      "/login?next=%2Fi%2Fabcdef123456",
    );
    expect(screen.queryByText(/pago|em falta|Pagamentos/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
