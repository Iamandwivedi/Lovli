// Native Google Sign-In wrapper. Hands back an id_token the backend verifies
// at POST /auth/google/token. Client IDs are public identifiers, not secrets,
// and are read from EXPO_PUBLIC_* at bundle time.
import { Platform } from "react-native";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";

const webClientId = (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "").trim();
const iosClientId = (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "").trim();

export class GoogleSignInError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleSignInError";
  }
}

let configured = false;
const ensureConfigured = () => {
  if (configured) return;
  GoogleSignin.configure({
    webClientId,
    iosClientId: iosClientId || undefined,
    scopes: ["email", "profile"],
    offlineAccess: false,
  });
  configured = true;
};

// True only when the bundle carries a web client ID. Without it the SDK cannot
// mint an id_token, so the button stays hidden.
export const isGoogleConfigured = (): boolean => webClientId.length > 0;

// Resolves to the id_token, or null when the user dismissed the sheet.
// Throws GoogleSignInError for anything else, with the raw SDK error logged only.
export const signInWithGoogle = async (): Promise<string | null> => {
  if (!isGoogleConfigured()) throw new GoogleSignInError("not configured");
  ensureConfigured();
  try {
    if (Platform.OS === "android") {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }
    const result = await GoogleSignin.signIn();
    if (result.type === "cancelled") return null;
    const idToken = result.data?.idToken;
    if (!idToken) throw new GoogleSignInError("no id_token in response");
    return idToken;
  } catch (err) {
    if (err instanceof GoogleSignInError) throw err;
    const code = (err as { code?: string })?.code;
    if (code === statusCodes.SIGN_IN_CANCELLED) return null;
    if (__DEV__) console.warn("[google] signIn failed", err);
    throw new GoogleSignInError(code || "sign_in_failed");
  }
};

// Clears the SDK's remembered account so the picker shows next time. Never throws.
export const signOutGoogle = async (): Promise<void> => {
  if (!isGoogleConfigured()) return;
  try {
    ensureConfigured();
    await GoogleSignin.signOut();
  } catch {
    // Nothing to do: logout must never fail because of the Google SDK.
  }
};
