"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

type Props = {
  inviteCode: string;
};

/** Link + QR do convite (organizador). */
export function InviteShare({ inviteCode }: Props) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/i/${inviteCode}`;

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-3 rounded border border-zinc-200 p-4">
      <p className="text-sm font-medium">Convite</p>
      <p className="break-all text-sm">
        <a href={url} className="underline">
          {url}
        </a>
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <QRCodeSVG value={url} size={128} />
        <button
          type="button"
          onClick={copy}
          className="rounded border border-zinc-300 px-3 py-1 text-sm"
        >
          {copied ? "Copiado!" : "Copiar link"}
        </button>
      </div>
      <p className="text-xs text-zinc-500">Código: {inviteCode}</p>
    </div>
  );
}