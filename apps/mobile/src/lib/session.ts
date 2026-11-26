import { logout, setToken } from "./api";
import { unregisterPush } from "./push";
import { clearReminders } from "./reminders";
import { resetSocket } from "./socket";

/** Sair da conta: deixa de receber push e lembretes desta conta neste telemóvel. */
export async function signOut(): Promise<void> {
  // Antes do logout: o pedido para apagar o token ainda precisa da sessão.
  await unregisterPush();
  await forgetThisDevice();
  await logout();
}

/**
 * Limpa o que ficou neste telemóvel: lembretes agendados, socket e sessão guardada.
 * Depois de apagar a conta, a API já apagou o resto (sessões e tokens de push).
 */
export async function forgetThisDevice(): Promise<void> {
  await clearReminders();
  resetSocket();
  await setToken(null);
}
