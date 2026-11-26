import { expect, test } from "@playwright/test";
import { createGame, PASSWORD, register, unique } from "./helpers";

test("o organizador cancela o jogo; o convidado vê logo que foi cancelado", async ({ browser }) => {
  const title = `Futebolada ${unique()}`;
  const orgContext = await browser.newContext();
  const org = await orgContext.newPage();
  await register(org, "Organizador");
  await createGame(org, title);
  const inviteHref = await org.locator('a[href*="/i/"]').first().getAttribute("href");

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(new URL(inviteHref!).pathname);
  await guest.getByRole("link", { name: "Entra ou cria conta" }).click();
  await guest.waitForURL(/\/login\?next=/);
  await register(guest, "Convidado");
  await guest.getByRole("button", { name: "Confirmar" }).click();
  await expect(guest.getByText("Estás confirmado")).toBeVisible();

  org.once("dialog", (d) => {
    expect(d.message()).toContain("A pessoa inscrita vai receber uma notificação");
    void d.accept();
  });
  await org.getByRole("button", { name: "Cancelar jogo" }).click();
  await expect(org.getByRole("status")).toHaveText("Este jogo foi cancelado pelo organizador.");
  await expect(org.getByRole("button", { name: "Editar" })).toHaveCount(0);

  // O convidado já não pode voltar a confirmar depois de desistir.
  await guest.getByRole("button", { name: "Desistir" }).click();
  await expect(guest.getByRole("button", { name: "Jogo cancelado" })).toBeDisabled();

  await orgContext.close();
  await guestContext.close();
});

test("esqueci-me da password: mesma mensagem, exista ou não a conta", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Esqueci-me da password" }).click();
  await page.getByPlaceholder("Email").fill(`ninguem-${unique()}@teste.local`);
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(page.getByText("Se existir uma conta com este email")).toBeVisible();
});

test("link de repor a password inválido: mensagem clara", async ({ page }) => {
  await page.goto(`/reset-password?token=${"a".repeat(43)}`);
  await page.getByPlaceholder("Password nova").fill("password-nova-123");
  await page.getByPlaceholder("Repete a password").fill("password-nova-123");
  await page.getByRole("button", { name: "Guardar password" }).click();
  await expect(page.getByText("Este link já não é válido. Pede um novo.")).toBeVisible();
});

test("o olho mostra a password no login", async ({ page }) => {
  await page.goto("/login");
  const input = page.getByPlaceholder("Password", { exact: true });
  await input.fill("segredo-123");
  await expect(input).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Mostrar password" }).click();
  await expect(input).toHaveAttribute("type", "text");
});

test("apagar a conta: pede a password e depois já não se entra", async ({ page }) => {
  const email = await register(page, "Apagar");
  await page.getByRole("link", { name: "Conta" }).click();
  await expect(page.getByText(email)).toBeVisible();

  const remove = page.getByRole("button", { name: "Apagar conta" });
  await page.getByPlaceholder("A tua password").fill("password-errada");
  await expect(remove).toBeDisabled(); // falta confirmar na caixa
  await page.getByLabel("Quero apagar a minha conta").check();
  await remove.click();
  await expect(page.getByText("Password incorreta.")).toBeVisible();

  await page.getByPlaceholder("A tua password").fill(PASSWORD);
  await remove.click();
  await page.waitForURL(/\/login/);

  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Email ou password incorretos.")).toBeVisible();
});
