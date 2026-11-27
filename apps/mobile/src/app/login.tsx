import { useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { ApiError, forgotPassword, login, register } from "../lib/api";
import { ensurePushRegistration } from "../lib/push";
import { syncReminders } from "../lib/reminders";
import { PasswordInput } from "../components/password-input";
import { Button, Card, Field, Notice } from "../components/ui";
import { PRIVACY_URL } from "../lib/links";
import { useLayout, usePalette, useThemedStyles, type Palette } from "../lib/theme";

type Mode = "login" | "register" | "forgot";

const SUBTITLE: Record<Mode, string> = {
  login: "Entra na tua conta",
  register: "Cria uma conta",
  forgot: "Recebe um link por email para escolheres uma password nova",
};

/** Só caminhos internos da app (evita open redirects). */
function safeNext(raw: string | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export default function LoginScreen() {
  const s = useThemedStyles(styles);
  const c = usePalette();
  const { gutter } = useLayout();
  const { next: nextParam } = useLocalSearchParams<{ next?: string }>();
  const next = safeNext(typeof nextParam === "string" ? nextParam : undefined);
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
      router.replace((next ?? "/games") as Href);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Algo correu mal.");
    } finally {
      setPending(false);
    }
  }

  const submitLabel = mode === "login" ? "Entrar" : mode === "register" ? "Registar" : "Enviar link";

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.canvas }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[s.scroll, { padding: gutter }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.wrap}>
          <View style={s.brand}>
            <View style={s.logo}>
              <Text style={s.logoText}>⚽</Text>
            </View>
            <Text style={s.title} accessibilityRole="header">
              Convocados
            </Text>
            <Text style={s.subtitle}>{SUBTITLE[mode]}</Text>
          </View>

          <Card>
            {mode === "register" && (
              <Field label="Nome" placeholder="Nome" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" />
            )}
            <Field
              label="Email"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            {mode !== "forgot" && (
              <View style={{ gap: 6 }}>
                <View style={s.passwordRow}>
                  <Text style={s.label}>Password</Text>
                  {mode === "login" && (
                    <Pressable onPress={() => switchTo("forgot")} hitSlop={8}>
                      <Text style={s.linkStrong}>Esqueci-me da password</Text>
                    </Pressable>
                  )}
                </View>
                <PasswordInput placeholder="Password" value={password} onChangeText={setPassword} />
                {mode === "register" && <Text style={s.small}>Pelo menos 10 caracteres.</Text>}
              </View>
            )}

            {error && <Notice tone="danger" text={error} />}
            {info && <Notice tone="ok" text={info} />}

            <Button label={submitLabel} onPress={onSubmit} loading={pending} />

            <View style={s.switchRow}>
              <Text style={s.small}>
                {mode === "login" ? "Ainda não tens conta? " : mode === "register" ? "Já estás registado? " : ""}
              </Text>
              <Pressable onPress={() => switchTo(mode === "login" ? "register" : "login")} hitSlop={8}>
                <Text style={s.linkStrong}>
                  {mode === "login" ? "Criar conta" : mode === "register" ? "Já tenho conta" : "Voltar ao login"}
                </Text>
              </Pressable>
            </View>
            {mode === "register" && (
              <Text style={[s.small, { textAlign: "center" }]}>
                Ao criar conta aceitas a{" "}
                <Text style={s.inlineLink} onPress={() => void Linking.openURL(PRIVACY_URL)}>
                  política de privacidade
                </Text>
                .
              </Text>
            )}
          </Card>

          {__DEV__ && (
            <Text style={s.debug}>API: {process.env.EXPO_PUBLIC_API_URL ?? "(não definido — reinicia o Expo)"}</Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (c: Palette) => ({
  scroll: { flexGrow: 1, justifyContent: "center" as const },
  wrap: { width: "100%" as const, maxWidth: 440, alignSelf: "center" as const, gap: 20 },
  brand: { alignItems: "center" as const, gap: 8 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: c.brand,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  logoText: { fontSize: 34 },
  title: { fontSize: 28, fontWeight: "800" as const, color: c.ink },
  subtitle: { color: c.muted, textAlign: "center" as const, fontSize: 15 },
  label: { fontSize: 14, fontWeight: "600" as const, color: c.ink },
  passwordRow: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const },
  switchRow: {
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    flexWrap: "wrap" as const,
    borderTopWidth: 1,
    borderTopColor: c.line,
    paddingTop: 14,
  },
  small: { color: c.muted, fontSize: 13 },
  linkStrong: { color: c.brandStrong, fontWeight: "700" as const, fontSize: 14 },
  inlineLink: { textDecorationLine: "underline" as const },
  debug: { color: c.muted, fontSize: 11, textAlign: "center" as const },
});
