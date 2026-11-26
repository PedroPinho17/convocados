import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GameForm } from "./game-form";

describe("GameForm com rascunho da IA", () => {
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
    expect(screen.getByDisplayValue("2030-01-10T21:00")).toBeInTheDocument();
    expect(screen.getByLabelText("Vagas")).toHaveValue(12);
    expect(screen.getByLabelText("Lista de espera (máx.)")).toHaveValue(2); // por defeito
    expect(screen.getByLabelText("Custo total (€)")).toHaveValue(42);
    expect(screen.getByText("Confirma os suplentes: não consegui ler bem.")).toBeInTheDocument();
  });

  it("envia o jogo com a data em UTC", async () => {
    const onSubmit = vi.fn(async () => undefined);
    render(
      <GameForm
        draft={{
          title: "Futebolada",
          location: "Pavilhão",
          startsAt: "2030-07-10T20:00:00.000Z",
        }}
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
    });
  });
});
