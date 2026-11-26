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
    { name: "A", players: [{ userId: "a", name: "Rui" }, { userId: "d", name: "Bia" }] },
    { name: "B", players: [{ userId: "b", name: "Tó" }, { userId: "c", name: "Zé" }] },
  ],
});

describe("GameTeams", () => {
  it("jogador sem equipas feitas: não mostra nada", () => {
    const { container } = render(
      <GameTeams game={game({ participations: four })} me={PLAYER} onChange={onChange} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("organizador: faz as equipas e guarda-as", async () => {
    api.generateTeams.mockResolvedValue(withTeams);
    render(<GameTeams game={game({ participations: four })} me={ORGANIZER} onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Fazer equipas" }));
    expect(api.generateTeams).toHaveBeenCalledWith("g1", { teamCount: 2 });
    expect(onChange).toHaveBeenCalledWith(withTeams);
  });

  it("organizador com menos de 2 confirmados: não deixa fazer equipas", () => {
    render(
      <GameTeams game={game({ participations: [player("a", "Rui")] })} me={ORGANIZER} onChange={onChange} />,
    );
    expect(screen.getByRole("button", { name: "Fazer equipas" })).toBeDisabled();
    expect(screen.getByText("Precisas de pelo menos 2 confirmados.")).toBeInTheDocument();
  });

  it("jogador vê as equipas guardadas, só com nomes (sem avaliações)", () => {
    render(<GameTeams game={withTeams} me={PLAYER} onChange={onChange} />);
    expect(screen.getByText("Equipa A")).toBeInTheDocument();
    expect(screen.getByText("Rui")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/skill|\(\d(\.\d)?\)/i);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("quem confirmou depois aparece como sem equipa; o organizador pode atualizar", () => {
    const later = { ...withTeams, participations: [...four, player("e", "Leo")], confirmedCount: 5 };
    render(<GameTeams game={later} me={ORGANIZER} onChange={onChange} />);
    expect(screen.getByText(/Sem equipa: Leo\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Atualizar equipas" })).toBeEnabled();
  });
});
