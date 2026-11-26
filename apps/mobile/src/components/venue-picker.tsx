import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { venueLabel, type Sport, type VenueDto } from "@convocados/shared";
import { searchVenues } from "../lib/api";
import { usePalette, useThemedStyles, type Palette } from "../lib/theme";
import { Field, Muted } from "./ui";

type Props = {
  value: string;
  venueId: string | null;
  sport: Sport;
  onChange: (location: string, venueId: string | null) => void;
};

/**
 * Local com sugestões da lista de campos. Escrever à mão continua a valer;
 * escolher da lista liga o venueId.
 */
export function VenuePicker({ value, venueId, sport, onChange }: Props) {
  const c = usePalette();
  const s = useThemedStyles(styles);
  const [results, setResults] = useState<VenueDto[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const query = venueId ? "" : value.trim();
  const shouldSearch = query.length >= 2;

  useEffect(() => {
    if (!shouldSearch) {
      setResults([]);
      setHint(null);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      searchVenues({ q: query, sport, limit: 6 }, ctrl.signal)
        .then((rows) => {
          setResults(rows);
          setHint(rows.length === 0 ? "Nenhum campo na lista: escreve o local à mão." : null);
        })
        .catch(() => undefined);
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, sport, shouldSearch]);

  return (
    <View style={{ gap: 6 }}>
      <Field
        label="Local"
        placeholder="Local ou nome do campo"
        value={value}
        onChangeText={(text) => onChange(text, null)}
        autoCapitalize="words"
      />
      {venueId ? <Muted>✓ Campo da lista</Muted> : hint ? <Muted>{hint}</Muted> : null}
      {results.length > 0 && !venueId ? (
        <View style={s.list}>
          {results.map((v) => (
            <Pressable
              key={v.id}
              accessibilityRole="button"
              onPress={() => {
                onChange(venueLabel(v), v.id);
                setResults([]);
              }}
              style={({ pressed }) => [s.row, pressed ? { backgroundColor: c.brandSoft } : null]}
            >
              <Text style={s.name} numberOfLines={1}>
                {v.name}
              </Text>
              <Text style={s.meta} numberOfLines={1}>
                {[v.city, v.address].filter(Boolean).join(" · ") || "Sem morada"}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = (c: Palette) => ({
  list: {
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 14,
    backgroundColor: c.surface,
    overflow: "hidden" as const,
  },
  row: { paddingHorizontal: 14, paddingVertical: 12, gap: 2, borderBottomWidth: 1, borderBottomColor: c.line },
  name: { fontSize: 15, fontWeight: "600" as const, color: c.ink },
  meta: { fontSize: 12, color: c.muted },
});
