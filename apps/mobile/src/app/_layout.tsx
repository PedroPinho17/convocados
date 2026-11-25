import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: "Entrar" }} />
      <Stack.Screen name="games/index" options={{ title: "Jogos" }} />
      <Stack.Screen name="games/[id]" options={{ title: "Jogo" }} />
    </Stack>
  );
}