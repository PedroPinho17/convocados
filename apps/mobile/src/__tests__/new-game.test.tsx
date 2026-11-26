import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { CreateGameInput } from "@convocados/shared";
import { NewGame } from "../components/new-game";
import { parseGameMessage } from "../lib/api";

jest.mock("../lib/api", () => {
  class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
  return { ApiError, parseGameMessage: jest.fn() };
});

const mockParse = jest.mocked(parseGameMessage);
const onCreate = jest.fn(async (_input: CreateGameInput) => undefined);

beforeEach(() => {
  jest.clearAllMocks();
});

const tab = (name: string) => screen.getByRole("tab", { name });

describe("NewGame (app): dois modos", () => {
  it("abre em 'Preencher à mão'; a mensagem só aparece no outro modo", async () => {
    await render(<NewGame onCreate={onCreate} />);
    expect(tab("Preencher à mão").props.accessibilityState?.selected).toBe(true);
    expect(screen.getByPlaceholderText("Título")).toBeTruthy();
    expect(screen.queryByLabelText("Mensagem do grupo")).toBeNull();

    await fireEvent.press(tab("Colar mensagem"));
    expect(screen.getByLabelText("Mensagem do grupo")).toBeTruthy();
    expect(screen.queryByPlaceholderText("Título")).toBeNull();
  });

  it("a IA preenche e volta ao formulário para rever", async () => {
    mockParse.mockResolvedValue({
      ok: true,
      remainingToday: 7,
      draft: { title: "Futebolada de quinta", location: "Romariz", slots: 12 },
    });
    await render(<NewGame onCreate={onCreate} />);
    await fireEvent.press(tab("Colar mensagem"));
    await fireEvent.changeText(screen.getByLabelText("Mensagem do grupo"), "Quinta 21h no Romariz, 12 jogadores");
    await fireEvent.press(screen.getByText("Preencher com IA"));

    expect(mockParse).toHaveBeenCalledWith({ message: "Quinta 21h no Romariz, 12 jogadores" });
    expect(await screen.findByDisplayValue("Futebolada de quinta")).toBeTruthy();
    expect(screen.getByDisplayValue("Romariz")).toBeTruthy();
    expect(screen.getByDisplayValue("12")).toBeTruthy();
    expect(screen.getByText(/Restam 7 pedidos hoje/)).toBeTruthy();
    expect(tab("Preencher à mão").props.accessibilityState?.selected).toBe(true);
  });

  it("se a IA falhar, fica no modo de colar com o erro", async () => {
    const { ApiError } = jest.requireMock<{ ApiError: new (m: string, s: number) => Error }>("../lib/api");
    mockParse.mockRejectedValue(new ApiError("Já usaste os 10 pedidos de IA de hoje.", 429));
    await render(<NewGame onCreate={onCreate} />);
    await fireEvent.press(tab("Colar mensagem"));
    await fireEvent.changeText(screen.getByLabelText("Mensagem do grupo"), "Quinta 21h no Romariz");
    await fireEvent.press(screen.getByText("Preencher com IA"));

    expect(await screen.findByText("Já usaste os 10 pedidos de IA de hoje.")).toBeTruthy();
    expect(tab("Colar mensagem").props.accessibilityState?.selected).toBe(true);
  });
});
