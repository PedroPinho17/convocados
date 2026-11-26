import { useMemo } from "react";
import { useColorScheme, useWindowDimensions } from "react-native";

/** As mesmas cores da web: desportivo e limpo, verde relvado. Claro ou escuro pelo sistema. */
export const palettes = {
  light: {
    canvas: "#f4f7f3",
    surface: "#ffffff",
    surface2: "#f8faf7",
    ink: "#101814",
    muted: "#5d6b63",
    line: "#e1e8e0",
    brand: "#15803d",
    brandStrong: "#116632",
    brandInk: "#ffffff",
    brandSoft: "#e3f5e8",
    warn: "#a15c07",
    warnSoft: "#fdf3e2",
    danger: "#b42318",
    dangerSoft: "#fdecea",
    ok: "#157f3c",
    okSoft: "#e6f6ec",
  },
  dark: {
    canvas: "#0b1210",
    surface: "#121c18",
    surface2: "#0f1814",
    ink: "#e7efe9",
    muted: "#97a69d",
    line: "#23322b",
    brand: "#2fbf62",
    brandStrong: "#4fd57c",
    brandInk: "#06140c",
    brandSoft: "#143322",
    warn: "#f0b45a",
    warnSoft: "#2e230f",
    danger: "#f2877d",
    dangerSoft: "#331715",
    ok: "#57d488",
    okSoft: "#12301f",
  },
};

export type Palette = typeof palettes.light;

export function usePalette(): Palette {
  return useColorScheme() === "dark" ? palettes.dark : palettes.light;
}

/** Estilos que dependem das cores: refeitos só quando o modo (claro/escuro) muda. */
export function useThemedStyles<T>(factory: (c: Palette) => T): T {
  const c = usePalette();
  // A fábrica é sempre a mesma função do módulo: só as cores mudam.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => factory(c), [c]);
}

/**
 * Layout responsivo: telemóvel, telemóvel deitado e tablet.
 * - wide (≥ 768 px): duas colunas onde fizer sentido;
 * - o conteúdo nunca passa de 1040 px de largura, centrado.
 */
export function useLayout() {
  const { width } = useWindowDimensions();
  const wide = width >= 768;
  return {
    width,
    wide,
    gutter: width >= 600 ? 24 : 16,
    maxWidth: 1040,
  };
}

export const radius = { sm: 10, md: 14, lg: 18 };
