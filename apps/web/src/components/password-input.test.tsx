import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PasswordInput } from "./password-input";

describe("PasswordInput", () => {
  it("o olho mostra e volta a esconder a password", async () => {
    render(<PasswordInput placeholder="Password" defaultValue="segredo-123" />);
    const input = screen.getByPlaceholderText("Password");
    expect(input).toHaveAttribute("type", "password");

    await userEvent.click(screen.getByRole("button", { name: "Mostrar password" }));
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Esconder password" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await userEvent.click(screen.getByRole("button", { name: "Esconder password" }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("o botão do olho não submete o formulário", async () => {
    let submitted = false;
    render(
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitted = true;
        }}
      >
        <PasswordInput placeholder="Password" />
      </form>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Mostrar password" }));
    expect(submitted).toBe(false);
  });
});
