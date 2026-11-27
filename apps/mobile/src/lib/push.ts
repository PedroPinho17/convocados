import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { getToken, registerPushToken, unregisterPushToken } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** EAS project id from `eas init` (`extra.eas.projectId` / easConfig). */
function easProjectId(): string | undefined {
  return (
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId
  );
}

/**
 * Pede permissão para notificações (push e lembretes locais) e cria o canal no Android.
 * Devolve true se o utilizador deixou.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== "granted") {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== "granted") return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Jogos",
      importance: AndroidImportance.DEFAULT,
    });
  }
  return true;
}

/**
 * Token Expo deste dispositivo. Precisa do projectId do EAS (`eas init`) e, em builds
 * nativos Android, das credenciais FCM V1. Sem projectId devolve null (a app continua).
 */
async function devicePushToken(): Promise<string | null> {
  const projectId = easProjectId();
  if (!projectId) return null;
  const push = await Notifications.getExpoPushTokenAsync({ projectId });
  return push.data;
}

/** Pede permissão, obtém o token Expo e regista-o na API. Ignora silenciosamente se falhar. */
export async function ensurePushRegistration(): Promise<void> {
  try {
    if (!(await getToken())) return;
    if (!(await ensureNotificationPermission())) return;
    const token = await devicePushToken();
    if (!token) return;
    await registerPushToken({
      token,
      platform: Platform.OS === "ios" ? "ios" : "android",
    });
  } catch {
    // Sem projectId EAS / FCM / Expo Go / rede: a app continua a funcionar sem push.
  }
}

/** Ao sair da conta: este dispositivo deixa de receber push desta conta. */
export async function unregisterPush(): Promise<void> {
  try {
    if (!(await getToken())) return;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;
    const token = await devicePushToken();
    if (!token) return;
    await unregisterPushToken({ token });
  } catch {
    // Sem token / rede: nada a fazer.
  }
}
