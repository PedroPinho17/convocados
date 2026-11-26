import { expect, test, type Page } from "@playwright/test";
import { register } from "./helpers";

/** Cria pelo proxy /api (com a sessão da página). */
async function post<T>(page: Page, url: string, data?: unknown): Promise<T> {
  const res = await page.request.post(`/api${url}`, { data });
  expect(res.ok(), `${url} → ${res.status()}`).toBeTruthy();
  return (await res.json()) as T;
}

/** Nada mais largo do que o ecrã: no telemóvel, deslizar para o lado é um bug de layout. */
async function expectNoHorizontalScroll(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `${url} é ${overflow}px mais larga do que o ecrã`).toBeLessThanOrEqual(0);
}

test.use({ viewport: { width: 375, height: 812 } });

test("telemóvel: nomes e títulos compridos não alargam nenhuma página", async ({ page }) => {
  await register(page, "Maria Antónia Rodrigues Fernandes da Silva");
  const group = await post<{ id: string; inviteCode: string }>(page, "/groups", {
    name: "Futebolada de quinta-feira dos amigos de Lourosa",
    sport: "football",
  });
  const game = await post<{ id: string; inviteCode: string }>(page, "/games", {
    title: "Futebolada semanal com os colegas do escritório e amigos",
    location: "Pavilhão Gimnodesportivo Municipal de Santa Maria de Lamas, Rua do Comendador",
    startsAt: "2030-01-10T21:00:00.000Z",
    slots: 10,
    subs: 2,
    totalPriceCents: 4500,
    sport: "football",
    groupId: group.id,
  });
  await post(page, `/games/${game.id}/confirm`);

  for (const url of [
    "/",
    "/games",
    `/games/${game.id}`,
    "/groups",
    `/groups/${group.id}`,
    `/i/${game.inviteCode}`,
    `/g/${group.inviteCode}`,
    "/account",
  ]) {
    await expectNoHorizontalScroll(page, url);
  }

  // O nome do grupo não vai para o botão Voltar (ficava enorme): só "Voltar ao grupo".
  await page.goto(`/games/${game.id}`);
  await expect(page.getByRole("link", { name: "Voltar ao grupo" })).toHaveAttribute("href", `/groups/${group.id}`);
});

test("quem entrou só pelo convite do jogo volta aos jogos, não ao grupo (onde não é membro)", async ({
  page,
  browser,
}) => {
  await register(page, "Organizador");
  const group = await post<{ id: string }>(page, "/groups", { name: "Padel da empresa", sport: "padel" });
  const game = await post<{ id: string; inviteCode: string }>(page, "/games", {
    title: "Padel de sexta",
    location: "Clube",
    startsAt: "2030-01-11T19:00:00.000Z",
    slots: 4,
    subs: 1,
    totalPriceCents: 2400,
    sport: "padel",
    groupId: group.id,
  });

  const guestCtx = await browser.newContext();
  const guest = await guestCtx.newPage();
  await register(guest, "Convidado");
  await post(guest, `/games/${game.id}/confirm`);
  await guest.goto(`/games/${game.id}`);

  await expect(guest.getByRole("link", { name: "Voltar aos jogos" })).toHaveAttribute("href", "/games");
  // O nome do grupo aparece, mas não como link (daria "Não és membro deste grupo").
  await expect(guest.getByText("Padel da empresa")).toBeVisible();
  await expect(guest.getByRole("link", { name: "Padel da empresa" })).toHaveCount(0);
  await guestCtx.close();
});
