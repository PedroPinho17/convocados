import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { PasswordInput } from "../components/password-input";
import { DeleteAccount } from "../components/delete-account";
import { ApiError, deleteAccount } from "../lib/api";
import { forgetThisDevice } from "../lib/session";

jest.mock("../lib/api", () => {
  class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
  return { ApiError, deleteAccount: jest.fn() };
});
jest.mock("../lib/session", () => ({ forgetThisDevice: jest.fn(async () => undefined) }));
jest.mock("expo-router", () => ({ router: { replace: jest.fn() } }));

const mockDelete = jest.mocked(deleteAccount);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PasswordInput", () => {
  it("o olho mostra e volta a esconder a password", async () => {
    await render(<PasswordInput placeholder="Password" value="segredo-123" />);
    const input = screen.getByPlaceholderText("Password");
    expect(input.props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByRole("button", { name: "Mostrar password" }));
    expect(screen.getByPlaceholderText("Password").props.secureTextEntry).toBe(false);

    await fireEvent.press(screen.getByRole("button", { name: "Esconder password" }));
    expect(screen.getByPlaceholderText("Password").props.secureTextEntry).toBe(true);
  });
});

describe("Apagar conta", () => {
  async function openAndType(password: string) {
    await render(<DeleteAccount />);
    await fireEvent.press(screen.getByText("Apagar conta"));
    await fireEvent.changeText(screen.getByPlaceholderText("A tua password"), password);
  }

  it("pede a password; depois de apagar, limpa o telemóvel e vai para o login", async () => {
    mockDelete.mockResolvedValue(undefined);
    await openAndType("a-minha-password");
    await fireEvent.press(screen.getByText("Apagar a minha conta"));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(mockDelete).toHaveBeenCalledWith({ password: "a-minha-password" });
    expect(forgetThisDevice).toHaveBeenCalled();
  });

  it("password errada: mostra o erro e não sai", async () => {
    mockDelete.mockRejectedValue(new ApiError("Password incorreta.", 403));
    await openAndType("errada");
    await fireEvent.press(screen.getByText("Apagar a minha conta"));

    expect(await screen.findByText("Password incorreta.")).toBeTruthy();
    expect(forgetThisDevice).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("sem password, o botão não faz nada", async () => {
    await openAndType("");
    await fireEvent.press(screen.getByText("Apagar a minha conta"));
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
