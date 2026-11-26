import { expect, test } from "@playwright/test";
import { register, unique } from "./helpers";

test("página inicial: apresenta a plataforma e leva ao registo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("convocatória da semana");
  await expect(page.getByText(/padel, ténis/)).toBeVisible();
  await page.getByRole("link", { name: "Criar conta grátis" }).first().click();
  await expect(page.getByPlaceholder("Nome")).toBeVisible();
});

test("grupo: criar, convidar pelo link, e o convidado vê o jogo do grupo", async ({ browser }) => {
  const groupName = `Padel ${unique().slice(-5)}`;
  const gameTitle = `Padel de sábado ${unique().slice(-4)}`;

  const orgContext = await browser.newContext();
  const org = await orgContext.newPage();
  await register(org, "Organizador");
  await org.getByRole("link", { name: "Grupos" }).click();
  await org.getByRole("textbox", { name: "Nome do grupo" }).fill(groupName);
  await org.getByRole("combobox", { name: "Desporto" }).selectOption("padel");
  await org.getByRole("button", { name: "Criar grupo" }).click();
  await expect(org.getByRole("heading", { name: groupName })).toBeVisible();
  const inviteHref = await org.locator('a[href*="/g/"]').first().getAttribute("href");
  expect(inviteHref).toMatch(/\/g\/[0-9a-f]{12}$/);

  // Convidado: abre o link sem conta, cria conta e entra no grupo.
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(new URL(inviteHref!).pathname);
  await expect(guest.getByRole("heading", { name: groupName })).toBeVisible();
  await guest.getByRole("link", { name: "Entra ou cria conta para entrar" }).click();
  await guest.waitForURL(/\/login\?next=/);
  await register(guest, "Convidado");
  await guest.getByRole("button", { name: "Entrar no grupo" }).click();
  await expect(guest.getByRole("heading", { name: groupName })).toBeVisible();

  // Organizador: cria um jogo no grupo (o desporto do grupo vem escolhido).
  await org.reload();
  await expect(org.getByText("2 membros")).toBeVisible();
  await expect(org.getByRole("combobox", { name: "Desporto" })).toHaveValue("padel");
  await expect(org.getByRole("spinbutton", { name: "Vagas" })).toHaveValue("4");
  await org.getByRole("textbox", { name: "Título" }).fill(gameTitle);
  await org.getByRole("combobox", { name: "Local" }).fill("Clube de Padel");
  await org.getByLabel("Dia", { exact: true }).fill("2030-02-01");
  await org.getByLabel("Hora", { exact: true }).fill("10:00");
  await org.getByRole("button", { name: "Criar jogo" }).click();
  await expect(org.getByRole("link", { name: gameTitle })).toBeVisible();

  // O convidado vê o jogo nos seus jogos sem ter confirmado nada.
  await guest.goto("/games");
  const card = guest.getByRole("listitem").filter({ hasText: gameTitle });
  await expect(card).toBeVisible();
  await expect(card).toContainText(groupName);

  await orgContext.close();
  await guestContext.close();
});
