import { describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { InviteQr } from "../components/invite-qr";

// O QR a sério desenha-se com react-native-svg (nativo): aqui só interessa o que recebe.
jest.mock("react-native-qrcode-svg", () => {
  const { Text } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    __esModule: true,
    default: (props: { value: string; size: number; color: string; backgroundColor: string }) => (
      <Text testID="qr-value">{`${props.value}|${props.size}|${props.color}|${props.backgroundColor}`}</Text>
    ),
  };
});

describe("InviteQr", () => {
  it("codifica o link do convite, preto sobre branco (lê-se também no modo escuro)", async () => {
    await render(<InviteQr url="https://convocados.example/i/abcdef123456" />);

    expect(screen.getByLabelText("QR code do convite")).toBeTruthy();
    expect(screen.getByTestId("qr-value").props.children).toBe(
      "https://convocados.example/i/abcdef123456|168|#000000|#ffffff",
    );
  });
});
