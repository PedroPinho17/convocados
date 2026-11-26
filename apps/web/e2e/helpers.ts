import type { Page } from "@playwright/test";

export const PASSWORD = "password-de-teste";

export const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Cria conta pela página de login; devolve o email usado. */
export async function register(page: Page, name: string): Promise<string> {
  // O link "Entra ou cria conta" do convite já traz o ?next=; aqui só se muda para registo.
  if (!page.url().includes("/login")) await page.goto("/login");
  const email = `${name.toLowerCase()}-${unique()}@teste.local`;
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByPlaceholder("Nome").fill(name);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Registar" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  return email;
}

/** Cria um jogo na página "Os meus jogos" e abre-o. */
export async function createGame(page: Page, title: string) {
  await page.getByPlaceholder("Título").fill(title);
  await page.getByPlaceholder("Local").fill("Pavilhão de teste");
  await page.getByLabel("Dia", { exact: true }).fill("2030-01-10");
  await page.getByLabel("Hora", { exact: true }).fill("21:00");
  await page.getByRole("button", { name: "Criar jogo" }).click();
  await page.getByRole("link", { name: title }).click();
  await page.getByRole("heading", { name: "Confirmados" }).waitFor();
}
