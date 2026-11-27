"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button, Card, CardTitle } from "@/components/ui";

type Props = {
  inviteCode: string;
};

/** Link + QR do convite (organizador). No telemóvel, "Partilhar" abre o WhatsApp e afins. */
export function InviteShare({ inviteCode }: Props) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/i/${inviteCode}`;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    try {
      await navigator.share({ title: "Convocados", text: "Entra no jogo:", url });
    } catch {
      // Cancelado pelo utilizador: nada a fazer.
    }
  }

  return (
    <Card>
      <CardTitle>Convite</CardTitle>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:flex-col lg:items-stretch xl:flex-row xl:items-center">
        {/* O QR precisa de fundo claro para ser lido, também no modo escuro. */}
        <div className="self-center rounded-xl bg-white p-3 shadow-[var(--shadow-soft)] ring-1 ring-line">
          <QRCodeSVG value={url} size={132} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <a href={url} className="break-all text-sm font-medium text-brand-strong underline">
            {url}
          </a>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={copy}>
              {copied ? "Copiado!" : "Copiar link"}
            </Button>
            {canShare ? (
              <Button size="sm" variant="secondary" onClick={() => void share()}>
                Partilhar
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted">Código: {inviteCode}</p>
        </div>
      </div>
    </Card>
  );
}
