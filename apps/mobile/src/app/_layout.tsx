import { useEffect } from "react";
import { Stack } from "expo-router";
import { ensurePushRegistration } from "../lib/push";
import { syncReminders } from "../lib/reminders";

export default function RootLayout() {
  useEffect(() => {
    // Ao abrir a app: regista o push e volta a agendar os lembretes de todos os jogos.
    void ensurePushRegistration().then(syncReminders);
  }, []);

  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: "Entrar" }} />
      <Stack.Screen name="games/index" options={{ title: "Jogos" }} />
      <Stack.Screen name="games/[id]" options={{ title: "Jogo" }} />
      <Stack.Screen name="settings" options={{ title: "Definições" }} />
    </Stack>
  );
}
