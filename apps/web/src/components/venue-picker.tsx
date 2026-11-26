"use client";

import { useEffect, useId, useRef, useState } from "react";
import { venueLabel, type Sport, type VenueDto } from "@convocados/shared";
import { searchVenues } from "@/lib/api";
import { cn, inputClass } from "@/components/ui";

type Props = {
  value: string;
  venueId: string | null;
  sport: Sport;
  onChange: (location: string, venueId: string | null) => void;
};

type Near = { lat: number; lng: number } | null;

/**
 * Campo "Local" com sugestões da lista de campos (OpenStreetMap + acrescentados).
 * Escreve-se o nome ou a localidade; "Perto de mim" usa a localização do browser.
 * Escrever à mão continua a valer: o campo escolhido só fica ligado se vier da lista.
 */
export function VenuePicker({ value, venueId, sport, onChange }: Props) {
  const listId = useId();
  const [results, setResults] = useState<VenueDto[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [near, setNear] = useState<Near>(null);
  const [locating, setLocating] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const query = venueId ? "" : value.trim();
  const shouldSearch = query.length >= 2 || near !== null;

  useEffect(() => {
    if (!shouldSearch) return;
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => {
      searchVenues(
        { q: query || undefined, sport, ...(near ? { lat: near.lat, lng: near.lng, radiusKm: 15 } : {}), limit: 8 },
        ctrl.signal,
      )
        .then((rows) => {
          setResults(rows);
          setActive(-1);
          setHint(rows.length === 0 ? "Nenhum campo encontrado: escreve o local à mão." : null);
        })
        .catch(() => undefined);
    }, 250);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, sport, near, shouldSearch]);

  // Fechar ao clicar fora.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(v: VenueDto) {
    onChange(venueLabel(v), v.id);
    setOpen(false);
    setResults([]);
    setNear(null);
  }

  function nearMe() {
    if (!navigator.geolocation) {
      setHint("O browser não deixa saber a localização.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setNear({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (venueId) onChange("", null);
        setOpen(true);
      },
      () => {
        setLocating(false);
        setHint("Sem acesso à localização: escreve o nome do campo ou da localidade.");
      },
      { timeout: 10_000, maximumAge: 300_000 },
    );
  }

  const visible = open && shouldSearch && results.length > 0;

  return (
    <div ref={boxRef} className="relative flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={`${listId}-input`} className="text-sm font-medium">
          Local
        </label>
        <button
          type="button"
          onClick={nearMe}
          disabled={locating}
          className="text-xs font-semibold text-brand-strong hover:underline disabled:opacity-60"
        >
          {locating ? "A localizar…" : "📍 Perto de mim"}
        </button>
      </div>
      <input
        id={`${listId}-input`}
        className={inputClass}
        placeholder="Local"
        autoComplete="off"
        role="combobox"
        aria-expanded={visible}
        aria-controls={`${listId}-list`}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
        value={value}
        required
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          // Escrever à mão desliga o campo escolhido da lista.
          onChange(e.target.value, null);
          setNear(null);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (!visible) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(results.length - 1, i + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(0, i - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            pick(results[active]!);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {venueId ? (
        <p className="text-xs font-medium text-ok">✓ Campo da lista</p>
      ) : hint && shouldSearch && open ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
      {visible ? (
        <ul
          id={`${listId}-list`}
          role="listbox"
          aria-label="Campos sugeridos"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-xl border border-line bg-surface p-1 shadow-lg"
        >
          {results.map((v, i) => (
            <li
              key={v.id}
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(v);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5",
                i === active ? "bg-brand-soft" : "hover:bg-surface-2",
              )}
            >
              <span className="min-w-0">
                <span className="block line-clamp-2 text-sm font-semibold">{v.name}</span>
                <span className="block line-clamp-2 text-xs text-muted">
                  {[v.city, v.address].filter(Boolean).join(" · ") || "Sem morada"}
                </span>
              </span>
              {v.distanceKm !== null ? (
                <span className="shrink-0 text-xs font-medium text-muted">{v.distanceKm} km</span>
              ) : null}
            </li>
          ))}
          {/* Licença ODbL: os campos vêm do OpenStreetMap e a atribuição tem de estar visível. */}
          <li role="presentation" className="px-3 pb-1 pt-2 text-[11px] text-muted">
            Campos ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-ink"
            >
              contribuidores do OpenStreetMap
            </a>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
