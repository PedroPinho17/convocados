import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { ApiError, forgotPassword, login, register } from "../lib/api";
import { ensurePushRegistration } from "../lib/push";
import { syncReminders } from "../lib/reminders";
import { PasswordInput } from "../components/password-input";
import { PRIVACY_URL } from "../lib/links";

type Mode = "login" | "register" | "forgot";

const SUBTITLE: Record<Mode, string> = {
  login: "Entra na tua conta",
  register: "Cria uma conta",
  forgot: "Recebe um link por email para escolheres uma password nova",
};

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function switchTo(m: Mode) {
    setMode(m);
    setError(null);
    setInfo(null);
  }

  async function onSubmit() {
    setError(null);
    setInfo(null);
    setPending(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (mode === "forgot") {
        await forgotPassword({ email: cleanEmail });
        // Igual exista ou não a conta: não se descobre quem está registado.
        setInfo(
          "Se existir uma conta com este email, enviámos um link para escolheres uma password nova. Vê também o spam.",
        );
        return;
      }
      if (mode === "login") await login({ email: cleanEmail, password });
      else await register({ name: name.trim(), email: cleanEmail, password });
      await ensurePushRegistration();
      void syncReminders();
      router.replace("/games");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Algo correu mal.");
    } finally {
      setPending(false);
    }
  }

  const submitLabel = mode === "login" ? "Entrar" : mode === "register" ? "Registar" : "Enviar link";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Convocados</Text>
      <Text style={styles.subtitle}>{SUBTITLE[mode]}</Text>

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
      {mode !== "forgot" && (
        <PasswordInput placeholder="Password" value={password} onChangeText={setPassword} />
      )}

      {error && <Text style={styles.error}>{error}</Text>}
      {info && <Text style={styles.info}>{info}</Text>}

      <Pressable style={styles.button} onPress={onSubmit} disabled={pending}>
        {pending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{submitLabel}</Text>
        )}
      </Pressable>

      {mode === "login" && (
        <Pressable onPress={() => switchTo("forgot")}>
          <Text style={styles.link}>Esqueci-me da password</Text>
        </Pressable>
      )}
      <Pressable onPress={() => switchTo(mode === "login" ? "register" : "login")}>
        <Text style={styles.link}>
          {mode === "login" ? "Criar conta" : mode === "register" ? "Já tenho conta" : "Voltar ao login"}
        </Text>
      </Pressable>
      {mode === "register" && (
        <Text style={styles.small}>
          Ao criar conta aceitas a{" "}
          <Text style={styles.inlineLink} onPress={() => void Linking.openURL(PRIVACY_URL)}>
            política de privacidade
          </Text>
          .
        </Text>
      )}

      {__DEV__ && (
        <Text style={styles.debug}>
          API: {process.env.EXPO_PUBLIC_API_URL ?? "(não definido — reinicia o Expo)"}
        </Text>
      )}
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
  small: { color: "#71717a", fontSize: 12, textAlign: "center" },
  inlineLink: { textDecorationLine: "underline" },
  error: { color: "#dc2626" },
  info: { color: "#15803d" },
  debug: { color: "#a1a1aa", fontSize: 11, textAlign: "center", marginTop: 8 },
});
