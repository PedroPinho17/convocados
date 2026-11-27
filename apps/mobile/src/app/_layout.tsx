import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ensurePushRegistration } from "../lib/push";
import { syncReminders } from "../lib/reminders";
import { usePalette } from "../lib/theme";

export default function RootLayout() {
  const c = usePalette();

  useEffect(() => {
    // Ao abrir a app: regista o push e volta a agendar os lembretes de todos os jogos.
    void ensurePushRegistration().then(syncReminders);
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: c.canvas },
          headerTintColor: c.brandStrong,
          headerTitleStyle: { color: c.ink, fontWeight: "700" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: c.canvas },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="games/index" options={{ title: "Convocados" }} />
        {/* iPhone: o botão de voltar diz para onde vai ("Jogos"), não o título do ecrã anterior. */}
        <Stack.Screen name="games/[id]" options={{ title: "Jogo", headerBackTitle: "Jogos" }} />
        <Stack.Screen name="settings" options={{ title: "Definições", headerBackTitle: "Jogos" }} />
        <Stack.Screen name="groups/index" options={{ title: "Grupos", headerBackTitle: "Jogos" }} />
        <Stack.Screen name="groups/[id]" options={{ title: "Grupo", headerBackTitle: "Grupos" }} />
        <Stack.Screen name="g/[code]" options={{ title: "Convite", headerBackTitle: "Grupos" }} />
      </Stack>
    </>
  );
}
