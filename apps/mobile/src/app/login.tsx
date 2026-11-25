import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { ApiError, login, register } from "../lib/api";

export default function LoginScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    setError(null);
    setPending(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (mode === "login") await login({ email: cleanEmail, password });
      else await register({ name: name.trim(), email: cleanEmail, password });
      router.replace("/games");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Algo correu mal.");
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Convocados</Text>
      <Text style={styles.subtitle}>
        {mode === "login" ? "Entra na tua conta" : "Cria uma conta"}
      </Text>

      {mode === "register" && (
        <TextInput
          style={styles.input}
          placeholder="Nome"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      )}
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error && <Text style={styles.error}>{error}</Text>}
      <Text style={styles.debug}>
        API: {process.env.EXPO_PUBLIC_API_URL ?? "(não definido — reinicia o Expo)"}
      </Text>

      <Pressable style={styles.button} onPress={onSubmit} disabled={pending}>
        {pending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {mode === "login" ? "Entrar" : "Registar"}
          </Text>
        )}
      </Pressable>

      <Pressable onPress={() => setMode(mode === "login" ? "register" : "login")}>
        <Text style={styles.link}>
          {mode === "login" ? "Criar conta" : "Já tenho conta"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: "600" },
  subtitle: { color: "#52525b", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    backgroundColor: "#18181b",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  link: { color: "#52525b", textAlign: "center", textDecorationLine: "underline" },
  error: { color: "#dc2626" },
  debug: { color: "#a1a1aa", fontSize: 11, textAlign: "center", marginTop: 8 },
});
