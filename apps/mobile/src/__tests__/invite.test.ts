import { describe, expect, it } from "@jest/globals";
import { inviteCodeFrom } from "../lib/invite";

describe("inviteCodeFrom", () => {
  it("lê o código de um link de convite do grupo", () => {
    expect(inviteCodeFrom("https://convocados-web.onrender.com/g/abc123def456")).toBe("abc123def456");
    expect(inviteCodeFrom("  https://x.pt/g/ABC123DEF456?utm=1 ")).toBe("abc123def456");
  });

  it("aceita só o código", () => {
    expect(inviteCodeFrom("abc123def456")).toBe("abc123def456");
  });

  it("recusa links de jogos e códigos inválidos", () => {
    expect(inviteCodeFrom("https://x.pt/i/abc123def456")).toBeNull();
    expect(inviteCodeFrom("abc123")).toBeNull();
    expect(inviteCodeFrom("https://x.pt/g/abc123def4567")).toBeNull();
  });
});
