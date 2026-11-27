import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import type { GroupDto } from "@convocados/shared";
import GroupsScreen from "../app/groups/index";
import { ApiError, createGroup, listGroups } from "../lib/api";

jest.mock("../lib/api", () => {
  class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
  return { ApiError, listGroups: jest.fn(), createGroup: jest.fn() };
});
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  // No ecrã real corre ao ganhar foco; no teste, ao montar.
  useFocusEffect: (cb: () => void) => jest.requireActual<typeof import("react")>("react").useEffect(cb, []),
}));

const mockList = jest.mocked(listGroups);
const mockCreate = jest.mocked(createGroup);

const group = (over: Partial<GroupDto> = {}): GroupDto => ({
  id: "g1",
  name: "Padel da empresa",
  sport: "padel",
  inviteCode: "abc123def456",
  role: "admin",
  memberCount: 4,
  createdAt: "2026-11-20T10:00:00.000Z",
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Ecrã de grupos (app)", () => {
  it("lista os meus grupos com o desporto e os membros", async () => {
    mockList.mockResolvedValue([group()]);
    await render(<GroupsScreen />);
    expect(await screen.findByText("Padel da empresa")).toBeTruthy();
    expect(screen.getByText("Padel · 4 membros")).toBeTruthy();
    expect(screen.getByText("Admin")).toBeTruthy();
  });

  it("cria um grupo e abre-o", async () => {
    mockList.mockResolvedValue([]);
    mockCreate.mockResolvedValue(group({ id: "novo", name: "Futebolada de quinta", sport: "football" }));
    await render(<GroupsScreen />);
    await fireEvent.changeText(await screen.findByPlaceholderText("Ex.: Futebolada de quinta"), "Futebolada de quinta");
    await fireEvent.press(screen.getByRole("button", { name: "Criar grupo" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/groups/novo"));
    expect(mockCreate).toHaveBeenCalledWith({ name: "Futebolada de quinta", sport: "football" });
  });

  it("abre o convite a partir do link colado e recusa links que não são de grupo", async () => {
    mockList.mockResolvedValue([]);
    await render(<GroupsScreen />);
    const input = await screen.findByPlaceholderText("https://…/g/…");

    await fireEvent.changeText(input, "https://convocados-web.onrender.com/i/abc123def456");
    await fireEvent.press(screen.getByRole("button", { name: "Abrir convite" }));
    expect(await screen.findByText(/Cola o link do convite do grupo/)).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();

    await fireEvent.changeText(input, "https://convocados-web.onrender.com/g/abc123def456");
    await fireEvent.press(screen.getByRole("button", { name: "Abrir convite" }));
    expect(router.push).toHaveBeenCalledWith("/g/abc123def456");
  });

  it("sem sessão, volta ao login", async () => {
    mockList.mockRejectedValue(new ApiError("Sessão inválida", 401));
    await render(<GroupsScreen />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
  });
});
