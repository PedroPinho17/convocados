import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NewGame } from "./new-game";

const api = vi.hoisted(() => ({ parseGameMessage: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  ...api,
}));

const onCreate = vi.fn(async () => undefined);
beforeEach(() => vi.clearAllMocks());

describe("NewGame: dois modos", () => {
  it("abre em 'Preencher à mão'; o texto colado só aparece no outro modo", async () => {
    render(<NewGame onCreate={onCreate} />);
    expect(screen.getByRole("tab", { name: "Preencher à mão" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByPlaceholderText("Título")).toBeInTheDocument();
    expect(screen.queryByLabelText("Mensagem do grupo")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Colar mensagem" }));
    expect(screen.getByLabelText("Mensagem do grupo")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Título")).not.toBeInTheDocument();
  });

  it("a IA preenche e volta ao formulário para rever", async () => {
    api.parseGameMessage.mockResolvedValue({
      ok: true,
      remainingToday: 7,
      draft: { title: "Futebolada de quinta", location: "Romariz", slots: 12 },
    });
    render(<NewGame onCreate={onCreate} />);
    await userEvent.click(screen.getByRole("tab", { name: "Colar mensagem" }));

    const ai = screen.getByRole("button", { name: "Preencher com IA" });
    expect(ai).toBeDisabled(); // precisa de pelo menos 10 caracteres
    await userEvent.type(screen.getByLabelText("Mensagem do grupo"), "Quinta 21h no Romariz, 12 jogadores");
    await userEvent.click(ai);

    expect(api.parseGameMessage).toHaveBeenCalledWith({ message: "Quinta 21h no Romariz, 12 jogadores" });
    expect(screen.getByRole("tab", { name: "Preencher à mão" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByPlaceholderText("Título")).toHaveValue("Futebolada de quinta");
    expect(screen.getByPlaceholderText("Local")).toHaveValue("Romariz");
    expect(screen.getByLabelText("Vagas")).toHaveValue(12);
    expect(screen.getByRole("status")).toHaveTextContent("Restam 7 pedidos hoje");
  });

  it("se a IA falhar, fica no modo de colar com o erro", async () => {
    const { ApiError } = await import("@/lib/api");
    api.parseGameMessage.mockRejectedValue(new ApiError("Já usaste os 10 pedidos de IA de hoje.", 429));
    render(<NewGame onCreate={onCreate} />);
    await userEvent.click(screen.getByRole("tab", { name: "Colar mensagem" }));
    await userEvent.type(screen.getByLabelText("Mensagem do grupo"), "Quinta 21h no Romariz");
    await userEvent.click(screen.getByRole("button", { name: "Preencher com IA" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Já usaste os 10 pedidos de IA de hoje.");
    expect(screen.getByRole("tab", { name: "Colar mensagem" })).toHaveAttribute("aria-selected", "true");
  });
});
