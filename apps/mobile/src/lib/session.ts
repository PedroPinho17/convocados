import { logout } from "./api";
import { unregisterPush } from "./push";
import { clearReminders } from "./reminders";
import { resetSocket } from "./socket";

/** Sair da conta: deixa de receber push e lembretes desta conta neste telemóvel. */
export async function signOut(): Promise<void> {
  // Antes do logout: o pedido para apagar o token ainda precisa da sessão.
  await unregisterPush();
  await clearReminders();
  resetSocket();
  await logout();
}
