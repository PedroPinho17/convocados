import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { radius, useLayout, usePalette, useThemedStyles, type Palette } from "../lib/theme";

/** Ecrã com scroll: margens que crescem com o ecrã e conteúdo centrado nos tablets. */
export function Screen({ children }: { children: ReactNode }) {
  const c = usePalette();
  const { gutter, maxWidth } = useLayout();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.canvas }}
      contentContainerStyle={{ flexGrow: 1, padding: gutter, paddingBottom: gutter * 2 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ width: "100%", maxWidth, alignSelf: "center", gap: 16 }}>{children}</View>
    </ScrollView>
  );
}

/** Duas colunas nos ecrãs largos (tablet, telemóvel deitado); uma coluna no resto. */
export function Columns({ main, side }: { main: ReactNode; side: ReactNode }) {
  const { wide } = useLayout();
  if (!wide) {
    return (
      <View style={{ gap: 16 }}>
        {main}
        {side}
      </View>
    );
  }
  return (
    <View style={{ flexDirection: "row", gap: 16, alignItems: "flex-start" }}>
      <View style={{ flex: 3, gap: 16 }}>{main}</View>
      <View style={{ flex: 2, gap: 16 }}>{side}</View>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const s = useThemedStyles(styles);
  return <View style={[s.card, style]}>{children}</View>;
}

export function CardTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  const s = useThemedStyles(styles);
  return (
    <View style={s.cardTitleRow}>
      <Text style={s.cardTitle} accessibilityRole="header">
        {children}
      </Text>
      {aside}
    </View>
  );
}

type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  label: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Botão com área de toque de pelo menos 44 px. */
export function Button({ label, variant = "primary", size = "md", loading, disabled, style, ...props }: ButtonProps) {
  const s = useThemedStyles(styles);
  const c = usePalette();
  const off = disabled || loading;
  const textColor = {
    primary: c.brandInk,
    secondary: c.ink,
    danger: c.danger,
    ghost: c.muted,
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      style={({ pressed }) => [
        s.button,
        size === "sm" ? s.buttonSm : null,
        s[variant],
        pressed && !off ? { opacity: 0.85 } : null,
        off ? { opacity: 0.5 } : null,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[s.buttonText, size === "sm" ? s.buttonTextSm : null, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Badge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "ok" | "warn" | "danger" | "brand" }) {
  const c = usePalette();
  const s = useThemedStyles(styles);
  const [bg, fg] = {
    neutral: [c.surface2, c.muted],
    ok: [c.okSoft, c.ok],
    warn: [c.warnSoft, c.warn],
    danger: [c.dangerSoft, c.danger],
    brand: [c.brandSoft, c.brandStrong],
  }[tone];
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={[s.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Notice({ text, tone }: { text: string; tone: "danger" | "warn" | "ok" | "brand" }) {
  const c = usePalette();
  const s = useThemedStyles(styles);
  const [bg, fg] = {
    danger: [c.dangerSoft, c.danger],
    warn: [c.warnSoft, c.warn],
    ok: [c.okSoft, c.ok],
    brand: [c.brandSoft, c.brandStrong],
  }[tone];
  return (
    <View style={[s.notice, { backgroundColor: bg }]} accessibilityLiveRegion="polite">
      <Text style={{ color: fg }}>{text}</Text>
    </View>
  );
}

/** Campo com rótulo por cima. */
export function Field({ label, style, ...props }: TextInputProps & { label: string }) {
  const s = useThemedStyles(styles);
  const c = usePalette();
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor={c.muted}
        accessibilityLabel={props.accessibilityLabel ?? label}
        style={[s.input, props.multiline ? s.inputMultiline : null, style]}
        {...props}
      />
    </View>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  const s = useThemedStyles(styles);
  return <Text style={s.muted}>{children}</Text>;
}

/** Estilos partilhados de campos (para quem precisa do TextInput diretamente). */
export function useInputStyle() {
  return useThemedStyles(styles).input;
}

const styles = (c: Palette) => ({
  card: {
    backgroundColor: c.surface,
    borderColor: c.line,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: 8,
  },
  cardTitle: { fontSize: 18, fontWeight: "700" as const, color: c.ink, flexShrink: 1 },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  buttonSm: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.sm },
  buttonText: { fontSize: 16, fontWeight: "700" as const },
  buttonTextSm: { fontSize: 14 },
  primary: { backgroundColor: c.brand },
  secondary: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.line },
  danger: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.danger },
  ghost: { backgroundColor: "transparent" },
  badge: { alignSelf: "flex-start" as const, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: "700" as const },
  notice: { borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: "600" as const, color: c.ink },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: radius.md,
    backgroundColor: c.surface,
    color: c.ink,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputMultiline: { minHeight: 110, textAlignVertical: "top" as const },
  muted: { color: c.muted, fontSize: 14 },
});
