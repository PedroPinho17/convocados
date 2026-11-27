import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameTeams } from "./game-teams";
import { game, ORGANIZER, player, PLAYER } from "@/test/factories";

const api = vi.hoisted(() => ({ generateTeams: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  ...api,
}));

const onChange = vi.fn();
beforeEach(() => vi.clearAllMocks());

const four = [player("a", "Rui"), player("b", "Tó"), player("c", "Zé"), player("d", "Bia")];
const withTeams = game({
  participations: four,
  teams: [
    {
      name: "A",
      totalStrength: 7.2,
      players: [
        { userId: "a", name: "Rui", preferredPosition: "MID", strength: 3.6 },
        { userId: "d", name: "Bia", preferredPosition: null, strength: 3.6 },
      ],
    },
    {
      name: "B",
      totalStrength: 7.0,
      players: [
        { userId: "b", name: "Tó", preferredPosition: "DEF", strength: 3.5 },
        { userId: "c", name: "Zé", preferredPosition: "GK", strength: 3.5 },
      ],
    },
  ],
  teamsBalance: { difference: 0.2, explanation: "Diferença de 0,2 pontos" },
});

describe("GameTeams", () => {
  it("jogador sem equipas feitas: não mostra nada", () => {
    const { container } = render(
      <GameTeams game={game({ participations: four })} me={PLAYER} onChange={onChange} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("organizador: gera as equipas equilibradas", async () => {
    api.generateTeams.mockResolvedValue(withTeams);
    render(<GameTeams game={game({ participations: four })} me={ORGANIZER} onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Gerar equipas equilibradas" }));
    expect(api.generateTeams).toHaveBeenCalledWith("g1", { teamCount: 2, seed: undefined });
    expect(onChange).toHaveBeenCalledWith(withTeams);
  });

  it("organizador com menos de 2 confirmados: não deixa gerar", () => {
    render(
      <GameTeams game={game({ participations: [player("a", "Rui")] })} me={ORGANIZER} onChange={onChange} />,
    );
    expect(screen.getByRole("button", { name: "Gerar equipas equilibradas" })).toBeDisabled();
    expect(screen.getByText("Precisas de pelo menos 2 confirmados.")).toBeInTheDocument();
  });

  it("jogador vê as equipas, forças e a diferença", () => {
    render(<GameTeams game={withTeams} me={PLAYER} onChange={onChange} />);
    expect(screen.getByText("Equipa A")).toBeInTheDocument();
    expect(screen.getByText("Rui")).toBeInTheDocument();
    expect(screen.getByText(/Diferença de 0,2 pontos/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Gerar/ })).not.toBeInTheDocument();
  });

  it("organizador pode gerar outra vez com semente", async () => {
    api.generateTeams.mockResolvedValue(withTeams);
    render(<GameTeams game={withTeams} me={ORGANIZER} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Gerar outra vez" }));
    expect(api.generateTeams).toHaveBeenCalledWith(
      "g1",
      expect.objectContaining({ teamCount: 2, seed: expect.any(Number) }),
    );
  });

  it("quem confirmou depois aparece como sem equipa", () => {
    const later = { ...withTeams, participations: [...four, player("e", "Leo")], confirmedCount: 5 };
    render(<GameTeams game={later} me={ORGANIZER} onChange={onChange} />);
    expect(screen.getByText(/Sem equipa: Leo\./)).toBeInTheDocument();
  });
});
