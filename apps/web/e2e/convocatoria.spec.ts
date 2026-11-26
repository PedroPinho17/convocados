import { expect, test, type Page } from "@playwright/test";

/**
 * O percurso principal, como um utilizador o faz no browser:
 * o organizador cria o jogo, partilha o link, o convidado regista-se pelo convite e
 * confirma, e o ecrã do organizador atualiza sozinho (socket). Depois desiste.
 */

const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function register(page: Page, name: string) {
  // O link "Entra ou cria conta" do convite já traz o ?next=; aqui só se muda para registo.
  if (!page.url().includes("/login")) await page.goto("/login");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByPlaceholder("Nome").fill(name);
  await page.getByPlaceholder("Email").fill(`${name.toLowerCase()}-${unique()}@teste.local`);
  await page.getByPlaceholder("Password").fill("password-de-teste");
  await page.getByRole("button", { name: "Registar" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

test("convite por link, confirmação e desistência aparecem logo no ecrã do organizador", async ({
  browser,
}) => {
  const title = `Futebolada ${unique()}`;

  // Organizador: regista-se e cria o jogo.
  const orgContext = await browser.newContext();
  const org = await orgContext.newPage();
  await register(org, "Organizador");
  await expect(org).toHaveURL(/\/games$/);

  await org.getByPlaceholder("Título").fill(title);
  await org.getByPlaceholder("Local").fill("Pavilhão de teste");
  await org.locator('input[type="datetime-local"]').fill("2030-01-10T21:00");
  await org.getByRole("button", { name: "Criar jogo" }).click();
  await org.getByRole("link", { name: title }).click();
  await expect(org.getByRole("heading", { name: "Confirmados" })).toBeVisible();
  await expect(org.getByText("Ainda ninguém.")).toBeVisible();

  const inviteHref = await org.locator('a[href*="/i/"]').first().getAttribute("href");
  expect(inviteHref).toMatch(/\/i\/[0-9a-f]{12}$/);

  // Convidado: abre o link noutro browser (sem sessão), cria conta e volta ao convite.
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(new URL(inviteHref!).pathname);
  await expect(guest.getByText(title)).toBeVisible();
  await guest.getByRole("link", { name: "Entra ou cria conta" }).click();
  await guest.waitForURL(/\/login\?next=/);
  await register(guest, "Convidado");
  await expect(guest).toHaveURL(/\/i\/[0-9a-f]{12}$/);

  await guest.getByRole("button", { name: "Confirmar" }).click();
  await expect(guest.getByText("Estás confirmado")).toBeVisible();

  // O organizador vê o convidado sem recarregar a página.
  const guestRow = org.getByRole("listitem").filter({ hasText: "Convidado" });
  await expect(guestRow).toBeVisible();
  await expect(guestRow).toContainText("em falta");

  // O organizador marca o pagamento; o convidado vê-o no seu ecrã.
  await guestRow.getByRole("button", { name: "Marcar pago" }).click();
  await expect(guest.getByText("pago.", { exact: false })).toBeVisible();

  // O convidado desiste; a lista do organizador volta a ficar vazia.
  await guest.getByRole("button", { name: "Desistir" }).click();
  await expect(org.getByText("Ainda ninguém.")).toBeVisible();

  await orgContext.close();
  await guestContext.close();
});

test("sem sessão, as páginas do jogo mandam para o login", async ({ page }) => {
  await page.goto("/games");
  await expect(page).toHaveURL(/\/login/);
});
