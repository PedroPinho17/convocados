import { escapeHtml } from './layout.js';
import { passwordResetEmail } from './password-reset.js';

describe('passwordResetEmail', () => {
  const resetUrl =
    'https://convocados.test/reset-password?token=abc123_SAFE-token';
  const appUrl = 'https://convocados.test';

  it('returns subject, html and text with the reset URL', () => {
    const mail = passwordResetEmail({
      name: 'Ana',
      resetUrl,
      appUrl,
    });

    expect(mail.subject).toBe('Repor a password do Convocados');
    expect(mail.html).toContain(resetUrl);
    expect(mail.html).toContain('Escolher nova password');
    expect(mail.html).toContain('Convocados');
    expect(mail.html).toContain('Olá Ana,');
    expect(mail.text).toContain(resetUrl);
    expect(mail.text).toContain('Olá Ana,');
    expect(mail.text).toContain(
      'O link é válido durante 30 minutos e só pode ser usado uma vez.',
    );
    expect(mail.text).toContain(appUrl);
  });

  it('escapes a malicious name in HTML but keeps it plain in text', () => {
    const malicious = `<img src=x onerror="alert(1)"> & ' "`;
    const escaped = escapeHtml(malicious);
    const mail = passwordResetEmail({
      name: malicious,
      resetUrl,
      appUrl,
    });

    expect(escaped).toBe(
      '&#60;img src=x onerror=&#34;alert(1)&#34;&#62; &#38; &#39; &#34;',
    );
    expect(mail.html).not.toContain('<img');
    expect(mail.html).not.toContain(malicious);
    expect(mail.html).toContain(`Olá ${escaped},`);
    expect(mail.text).toContain(`Olá ${malicious},`);
  });
});

