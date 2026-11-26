import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ApiError, deleteAccount } from "../lib/api";
import { PRIVACY_URL } from "../lib/links";
import { forgetThisDevice } from "../lib/session";
import { PasswordInput } from "./password-input";

/** Conta: política de privacidade e apagar a conta (pede a password outra vez). */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onDelete() {
    setError(null);
    setPending(true);
    try {
      await deleteAccount({ password });
      await forgetThisDevice();
      router.replace("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível apagar a conta.");
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Conta</Text>
      <Text style={styles.link} onPress={() => void Linking.openURL(PRIVACY_URL)}>
        Política de privacidade
      </Text>

      {!open ? (
        <Pressable onPress={() => setOpen(true)} accessibilityRole="button">
          <Text style={styles.danger}>Apagar conta</Text>
        </Pressable>
      ) : (
        <View style={styles.confirm}>
          <Text style={styles.hint}>
            Apaga o teu nome, email, avaliações e os jogos que organizaste. Nos jogos dos outros sais
            como numa desistência normal. Não dá para desfazer.
          </Text>
          <PasswordInput placeholder="A tua password" value={password} onChangeText={setPassword} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.row}>
            <Pressable
              style={styles.secondary}
              onPress={() => {
                setOpen(false);
                setPassword("");
                setError(null);
              }}
            >
              <Text>Não apagar</Text>
            </Pressable>
            <Pressable
              style={[styles.dangerButton, (pending || !password) && styles.disabled]}
              disabled={pending || !password}
              onPress={() => void onDelete()}
            >
              {pending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.dangerButtonText}>Apagar a minha conta</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 10, marginTop: 24, borderTopWidth: 1, borderTopColor: "#e4e4e7", paddingTop: 16 },
  title: { fontSize: 18, fontWeight: "600" },
  link: { color: "#52525b", textDecorationLine: "underline" },
  danger: { color: "#b91c1c", textDecorationLine: "underline" },
  confirm: { gap: 10 },
  hint: { color: "#71717a" },
  error: { color: "#dc2626" },
  row: { flexDirection: "row", gap: 8 },
  secondary: {
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  dangerButton: {
    flex: 1,
    backgroundColor: "#b91c1c",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  dangerButtonText: { color: "#fff", fontWeight: "600" },
  disabled: { opacity: 0.5 },
});
