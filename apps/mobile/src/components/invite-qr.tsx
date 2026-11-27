import { View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { radius, usePalette } from "../lib/theme";

/**
 * QR do link do convite (como na web): quem está ao lado aponta a câmara e entra.
 * Fundo branco e QR preto sempre, também no modo escuro, senão muitas câmaras não o leem.
 */
export function InviteQr({ url, size = 168 }: { url: string; size?: number }) {
  const c = usePalette();
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="QR code do convite"
      testID="invite-qr"
      style={{
        alignSelf: "center",
        backgroundColor: "#ffffff",
        padding: 12,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: c.line,
      }}
    >
      <QRCode value={url} size={size} color="#000000" backgroundColor="#ffffff" ecl="M" />
    </View>
  );
}
