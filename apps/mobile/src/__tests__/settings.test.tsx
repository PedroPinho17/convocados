import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import type { RemindersDto } from "@convocados/shared";
import SettingsScreen from "../app/settings";
import { ApiError, getReminders, setReminders } from "../lib/api";
import { syncReminders } from "../lib/reminders";

jest.mock("../lib/api", () => {
  class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
  return { ApiError, getReminders: jest.fn(), setReminders: jest.fn() };
});
jest.mock("../lib/push", () => ({ ensureNotificationPermission: jest.fn(async () => true) }));
jest.mock("../lib/reminders", () => ({ syncReminders: jest.fn(async () => undefined) }));
jest.mock("expo-router", () => ({ router: { replace: jest.fn() } }));

const mockGet = jest.mocked(getReminders);
const mockSet = jest.mocked(setReminders);
const reply = (reminderMinutes: number[]): RemindersDto => ({ reminderMinutes, games: [] });

// Uma opção marcada também tem o "✓" no nome: procurar pelo início.
const option = (label: string) => screen.getByRole("checkbox", { name: new RegExp(`^${label}`) });
const isChecked = (label: string) => option(label).props.accessibilityState?.checked;

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue(reply([120]));
  mockSet.mockImplementation(async ({ reminderMinutes }) => reply(reminderMinutes));
});

describe("Ecrã de lembretes", () => {
  it("mostra as escolhas guardadas (por defeito, 2 h antes)", async () => {
    await render(<SettingsScreen />);
    expect(await screen.findByText("Lembretes antes do jogo")).toBeTruthy();
    expect(isChecked("2 h antes")).toBe(true);
    expect(isChecked("15 min antes")).toBe(false);
  });

  it("no máximo 3: com 3 escolhidos, os outros ficam bloqueados", async () => {
    await render(<SettingsScreen />);
    await screen.findByText("Lembretes antes do jogo");

    await fireEvent.press(option("15 min antes"));
    await fireEvent.press(option("1 dia antes"));

    expect(isChecked("15 min antes")).toBe(true);
    expect(isChecked("1 dia antes")).toBe(true);
    expect(option("30 min antes").props.accessibilityState?.disabled).toBe(true);
    await fireEvent.press(option("30 min antes"));
    expect(isChecked("30 min antes")).toBe(false);

    // Desmarcar um liberta lugar.
    await fireEvent.press(option("2 h antes"));
    expect(option("30 min antes").props.accessibilityState?.disabled).toBe(false);
  });

  it("guardar envia a escolha à API e volta a agendar os lembretes", async () => {
    await render(<SettingsScreen />);
    await screen.findByText("Lembretes antes do jogo");

    await fireEvent.press(option("30 min antes"));
    await fireEvent.press(screen.getByText("Guardar"));

    await waitFor(() => expect(screen.getByText("Guardado")).toBeTruthy());
    expect(mockSet).toHaveBeenCalledWith({ reminderMinutes: [120, 30] });
    expect(syncReminders).toHaveBeenCalled();
  });

  it("sem lembretes também é uma escolha válida", async () => {
    await render(<SettingsScreen />);
    await screen.findByText("Lembretes antes do jogo");

    await fireEvent.press(option("2 h antes"));
    expect(screen.getByText("Sem lembretes.")).toBeTruthy();
    await fireEvent.press(screen.getByText("Guardar"));
    await waitFor(() => expect(mockSet).toHaveBeenCalledWith({ reminderMinutes: [] }));
  });

  it("mostra o erro se não conseguir guardar", async () => {

    mockSet.mockRejectedValue(new ApiError("No máximo 3 lembretes.", 400));
    await render(<SettingsScreen />);
    await screen.findByText("Lembretes antes do jogo");

    await fireEvent.press(screen.getByText("Guardar"));
    expect(await screen.findByText("No máximo 3 lembretes.")).toBeTruthy();
    expect(syncReminders).not.toHaveBeenCalled();
  });

  it("sem sessão vai para o login", async () => {

    mockGet.mockRejectedValue(new ApiError("Sessão inválida", 401));
    await render(<SettingsScreen />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
  });
});
