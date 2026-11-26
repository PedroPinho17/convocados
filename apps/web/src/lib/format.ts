/** Datas como se dizem em Portugal: "qui., 10 jan. · 21:00". */
export function formatGameDate(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("pt-PT", { weekday: "short", day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  return `${day} · ${time}`;
}

/** Para o "calendário" dos cartões: { day: "10", month: "jan." }. */
export function dateParts(iso: string): { day: string; month: string; weekday: string } {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("pt-PT", { day: "numeric" }),
    month: d.toLocaleDateString("pt-PT", { month: "short" }),
    weekday: d.toLocaleDateString("pt-PT", { weekday: "short" }),
  };
}
