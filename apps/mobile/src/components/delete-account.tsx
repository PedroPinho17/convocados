import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { ApiError, deleteAccount } from "../lib/api";
import { PRIVACY_URL } from "../lib/links";
import { forgetThisDevice } from "../lib/session";
import { usePalette } from "../lib/theme";
import { PasswordInput } from "./password-input";
import { Button, Muted, Notice } from "./ui";

/** Conta: política de privacidade e apagar a conta (pede a password outra vez). */
export function DeleteAccount() {
  const c = usePalette();
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
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "800", color: c.ink }} accessibilityRole="header">
        Conta
      </Text>
      <Text
        style={{ color: c.brandStrong, fontWeight: "600", textDecorationLine: "underline" }}
        accessibilityRole="link"
        onPress={() => void Linking.openURL(PRIVACY_URL)}
      >
        Política de privacidade
      </Text>

      {!open ? (
        <Pressable onPress={() => setOpen(true)} accessibilityRole="button" hitSlop={8} style={{ alignSelf: "flex-start" }}>
          <Text style={{ color: c.danger, fontWeight: "700", paddingVertical: 8 }}>Apagar conta</Text>
        </Pressable>
      ) : (
        <View style={{ gap: 12 }}>
          <Muted>
            Apaga o teu nome, email, avaliações e os jogos que organizaste. Nos jogos dos outros sais como
            numa desistência normal. Não dá para desfazer.
          </Muted>
          <PasswordInput placeholder="A tua password" value={password} onChangeText={setPassword} />
          {error ? <Notice tone="danger" text={error} /> : null}
          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
            <Button
              label="Não apagar"
              variant="secondary"
              onPress={() => {
                setOpen(false);
                setPassword("");
                setError(null);
              }}
            />
            <Button
              label="Apagar a minha conta"
              variant="danger"
              loading={pending}
              disabled={!password}
              onPress={() => void onDelete()}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      )}
    </View>
  );
}
