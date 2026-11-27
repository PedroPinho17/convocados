import {
  escapeHtml,
  renderButton,
  renderEmailLayout,
  type MailMessage,
} from './layout.js';

export type PasswordResetEmailInput = {
  name: string;
  resetUrl: string;
  appUrl: string;
};

/**
 * Password-reset message in European Portuguese.
 * Returns subject + HTML + plain text for MailerService.
 */
export function passwordResetEmail({
  name,
  resetUrl,
  appUrl,
}: PasswordResetEmailInput): MailMessage {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(resetUrl);

  const bodyHtml = [
    `<p style="margin:0 0 16px 0;">Olá ${safeName},</p>`,
    `<p style="margin:0 0 16px 0;">Recebemos um pedido para repor a password da tua conta no Convocados. Escolhe uma nova password com o botão abaixo.</p>`,
    renderButton('Escolher nova password', resetUrl),
    `<p style="margin:0 0 16px 0;font-size:14px;color:#52525b;">Se o botão não funcionar, copia e cola este link no browser:</p>`,
    `<p style="margin:0 0 16px 0;font-size:14px;word-break:break-all;"><a href="${safeUrl}" style="color:#15803d;text-decoration:underline;">${safeUrl}</a></p>`,
    `<p style="margin:0 0 16px 0;">O link é válido durante 30 minutos e só pode ser usado uma vez.</p>`,
    `<p style="margin:0;">Se não foste tu a pedir, ignora este email: a tua password continua igual.</p>`,
  ].join('\n');

  const html = renderEmailLayout({
    preheader: 'Escolhe uma nova password para a tua conta no Convocados.',
    bodyHtml,
    appUrl,
  });

  const text = [
    'Convocados',
    '',
    `Olá ${name},`,
    '',
    'Recebemos um pedido para repor a password da tua conta no Convocados. Escolhe uma nova password com o link abaixo:',
    '',
    resetUrl,
    '',
    'O link é válido durante 30 minutos e só pode ser usado uma vez.',
    '',
    'Se não foste tu a pedir, ignora este email: a tua password continua igual.',
    '',
    '—',
    'Convocados · Organiza os teus jogos',
    appUrl,
  ].join('\n');

  return {
    subject: 'Repor a password do Convocados',
    html,
    text,
  };
}
