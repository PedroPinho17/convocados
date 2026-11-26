import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

type Props = Omit<TextInputProps, "secureTextEntry">;

/** Campo de password com o "olhinho" para mostrar ou esconder o que se escreveu. */
export function PasswordInput({ style, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.wrap}>
      <TextInput
        {...props}
        style={[styles.input, style]}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable
        style={styles.eye}
        onPress={() => setVisible((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={visible ? "Esconder password" : "Mostrar password"}
        accessibilityState={{ selected: visible }}
        hitSlop={8}
      >
        <Text style={styles.eyeText}>{visible ? "🙈" : "👁"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 8,
    paddingLeft: 12,
    paddingRight: 44,
    paddingVertical: 10,
  },
  eye: { position: "absolute", right: 0, width: 44, height: "100%", alignItems: "center", justifyContent: "center" },
  eyeText: { fontSize: 18 },
});
