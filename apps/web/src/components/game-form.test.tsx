import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GroupDto } from "@convocados/shared";
import { GameForm } from "./game-form";

const api = vi.hoisted(() => ({ searchVenues: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  ...api,
}));

beforeEach(() => {
  vi.clearAllMocks();
  api.searchVenues.mockResolvedValue([]);
});

const padelGroup: GroupDto = {
  id: "grp-1",
  name: "Padel da empresa",
  sport: "padel",
  inviteCode: "abcdef123456",
  role: "admin",
  memberCount: 6,
  createdAt: "2030-01-01T10:00:00.000Z",
};

describe("GameForm", () => {
  it("preenche os campos que a IA leu e mostra as notas", () => {
    render(
      <GameForm
        draft={{
          title: "Futebolada de quinta",
          location: "Pavilhão de Arrifana",
          startsAt: "2030-01-10T21:00:00.000Z",
          slots: 12,
          totalPriceCents: 4200,
          notes: "Confirma os suplentes: não consegui ler bem.",
        }}
        submitLabel="Criar jogo"
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText("Título")).toHaveValue("Futebolada de quinta");
    expect(screen.getByPlaceholderText("Local")).toHaveValue("Pavilhão de Arrifana");
    expect(screen.getByLabelText("Dia")).toHaveValue("2030-01-10");
    expect(screen.getByLabelText("Hora")).toHaveValue("21:00");
    expect(screen.getByLabelText("Vagas")).toHaveValue(12);
    expect(screen.getByLabelText("Suplentes")).toHaveValue(2); // por defeito
    expect(screen.getByLabelText("Custo (€)")).toHaveValue(42);
    expect(screen.getByText("Confirma os suplentes: não consegui ler bem.")).toBeInTheDocument();
  });

  it("envia o jogo com a data em UTC, o desporto e sem grupo", async () => {
    const onSubmit = vi.fn(async () => undefined);
    render(
      <GameForm
        draft={{ title: "Futebolada", location: "Pavilhão", startsAt: "2030-07-10T20:00:00.000Z" }}
        submitLabel="Criar jogo"
        onSubmit={onSubmit}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Criar jogo" }));
    expect(onSubmit).toHaveBeenCalledWith({
      title: "Futebolada",
      location: "Pavilhão",
      startsAt: "2030-07-10T20:00:00.000Z",
      slots: 10,
      subs: 2,
      totalPriceCents: 3000,
      sport: "football",
      venueId: null,
      groupId: null,
    });
  });

  it("mudar o desporto troca as vagas por defeito (se ainda não as mudaste)", async () => {
    render(<GameForm submitLabel="Criar jogo" onSubmit={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText("Desporto"), "padel");
    expect(screen.getByLabelText("Vagas")).toHaveValue(4);
    expect(screen.getByLabelText("Suplentes")).toHaveValue(1);

    await userEvent.clear(screen.getByLabelText("Vagas"));
    await userEvent.type(screen.getByLabelText("Vagas"), "6");
    await userEvent.selectOptions(screen.getByLabelText("Desporto"), "basketball");
    expect(screen.getByLabelText("Vagas")).toHaveValue(6); // mantém o que escreveste
  });

  it("escolher um grupo usa o desporto do grupo", async () => {
    render(<GameForm groups={[padelGroup]} submitLabel="Criar jogo" onSubmit={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText("Grupo"), "grp-1");
    expect(screen.getByLabelText("Desporto")).toHaveValue("padel");
    expect(screen.getByLabelText("Vagas")).toHaveValue(4);
  });

  it("escolher um campo da lista liga-o ao jogo; escrever à mão desliga", async () => {
    api.searchVenues.mockResolvedValue([
      {
        id: "v1",
        name: "Pavilhão Municipal",
        city: "Fiães",
        address: null,
        lat: 40.98,
        lng: -8.52,
        sports: ["futsal"],
        distanceKm: null,
      },
    ]);
    const onSubmit = vi.fn(async () => undefined);
    render(
      <GameForm
        draft={{ title: "Jogo", startsAt: "2030-07-10T20:00:00.000Z" }}
        submitLabel="Criar jogo"
        onSubmit={onSubmit}
      />,
    );
    await userEvent.type(screen.getByPlaceholderText("Local"), "fiaes");
    await userEvent.click(await screen.findByRole("option", { name: /Pavilhão Municipal/ }));
    expect(screen.getByPlaceholderText("Local")).toHaveValue("Pavilhão Municipal · Fiães");
    expect(screen.getByText("✓ Campo da lista")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Criar jogo" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ venueId: "v1" }));

    await userEvent.type(screen.getByPlaceholderText("Local"), " (campo 2)");
    expect(screen.queryByText("✓ Campo da lista")).not.toBeInTheDocument();
  });
});
