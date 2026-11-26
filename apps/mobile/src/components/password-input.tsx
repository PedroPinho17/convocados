import { useState } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import { useInputStyle } from "./ui";
import { usePalette } from "../lib/theme";

type Props = Omit<TextInputProps, "secureTextEntry">;

/** Campo de password com o "olhinho" para mostrar ou esconder o que se escreveu. */
export function PasswordInput({ style, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  const input = useInputStyle();
  const c = usePalette();
  return (
    <View style={{ justifyContent: "center" }}>
      <TextInput
        placeholderTextColor={c.muted}
        {...props}
        style={[input, { paddingRight: 52 }, style]}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable
        style={{
          position: "absolute",
          right: 0,
          width: 52,
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
        }}
        onPress={() => setVisible((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={visible ? "Esconder password" : "Mostrar password"}
        accessibilityState={{ selected: visible }}
        hitSlop={8}
      >
        <Text style={{ fontSize: 18, color: c.muted }}>{visible ? "🙈" : "👁"}</Text>
      </Pressable>
    </View>
  );
}
