"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button, Card, CardTitle } from "@/components/ui";

/** Link de convite do grupo (/g/<código>), com QR, copiar e partilhar. */
export function GroupInvite({ inviteCode, groupName }: { inviteCode: string; groupName: string }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/g/${inviteCode}`;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    try {
      await navigator.share({ title: groupName, text: `Entra no grupo "${groupName}" no Convocados:`, url });
    } catch {
      // Cancelado: nada a fazer.
    }
  }

  return (
    <Card>
      <CardTitle>Convidar para o grupo</CardTitle>
      <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col">
        {/* O QR precisa de fundo claro para ser lido, também no modo escuro. */}
        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-line">
          <QRCodeSVG value={url} size={120} />
        </div>
        <div className="flex w-full min-w-0 flex-col gap-3">
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
        </div>
      </div>
    </Card>
  );
}
