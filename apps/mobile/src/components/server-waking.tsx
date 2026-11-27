import { useSyncExternalStore } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { hasSlowRequests, subscribeSlowRequests } from "../lib/slow-requests";
import { usePalette } from "../lib/theme";

export const SERVER_WAKING_TEXT = "A acordar o servidor… pode demorar até 1 minuto.";

/** Aviso no fundo do ecrã enquanto algum pedido à API está a demorar (servidor a acordar). */
export function ServerWaking() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const slow = useSyncExternalStore(subscribeSlowRequests, hasSlowRequests, () => false);

  if (!slow) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: Math.max(insets.bottom, 16),
        alignItems: "center",
      }}
    >
      <View
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: c.line,
          backgroundColor: c.warnSoft,
        }}
      >
        <ActivityIndicator size="small" color={c.warn} />
        <Text style={{ color: c.warn, fontWeight: "600", flexShrink: 1 }}>{SERVER_WAKING_TEXT}</Text>
      </View>
    </View>
  );
}
