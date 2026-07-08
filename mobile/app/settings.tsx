// Settings — "V2 · Coach — Settings". Reached from the Reply Home avatar.
// Face ID + notification toggles are PREFERENCE-ONLY for now (stored locally,
// wired to native auth / push in a later build).
import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Screen } from "@/src/components/Screen";
import { Sparkle } from "@/src/components/Sparkle";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/context/ToastContext";
import { extractErrorMessage } from "@/src/api/client";
import {
  Language, Vibe, getTimezone, listMemoryCards, deleteMemoryCard, patchSettings,
} from "@/src/api/endpoints";
import { storage } from "@/src/utils/storage";
import { ASK_PENDING_KEY, ASK_THREAD_KEY, PREFS_KEY } from "@/src/config/storage-keys";
import { colors, radii, typography } from "@/src/theme";

const LANGUAGES: Language[] = ["English", "Hinglish", "Hindi + English mixed"];
const VIBES: Vibe[] = ["Playful", "Flirty", "Sincere", "Respectful", "Confident"];
const DATING = ["Women", "Men", "Everyone"];

type Prefs = {
  default_vibe: Vibe;
  dating: string;
  notif_reminders: boolean;
  notif_checkin: boolean;
  face_id: boolean;
};
const DEFAULT_PREFS: Prefs = {
  default_vibe: "Playful", dating: "Women",
  notif_reminders: true, notif_checkin: false, face_id: false,
};

export default function SettingsScreen() {
  const router = useRouter();
  const { user, updateUser, logout } = useAuth();
  const toast = useToast();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [picker, setPicker] = useState<null | "language" | "vibe" | "dating">(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const language = (user?.language_preference as Language) || "Hinglish";
  const isPro = user?.plan === "pro";

  useEffect(() => {
    storage.getItem<string>(PREFS_KEY, "").then((raw) => {
      if (raw) try { setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) }); } catch { /* keep defaults */ }
    });
  }, []);

  const savePrefs = (next: Prefs) => {
    setPrefs(next);
    storage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
  };

  const setLanguage = async (l: Language) => {
    try {
      const updated = await patchSettings({ language_preference: l, timezone: getTimezone() });
      updateUser(updated);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not save."));
    }
  };

  const deleteMemories = async () => {
    if (confirmText.trim().toUpperCase() !== "DELETE") return;
    setDeleting(true);
    try {
      const cards = await listMemoryCards();
      for (const c of cards) await deleteMemoryCard(c.id);
      await storage.removeItem(ASK_THREAD_KEY);
      await storage.removeItem(ASK_PENDING_KEY);
      setConfirmOpen(false);
      setConfirmText("");
      toast.success("Gone — every memory, wiped clean.");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not delete everything."));
    } finally {
      setDeleting(false);
    }
  };

  const pickerOptions = picker === "language" ? LANGUAGES : picker === "vibe" ? VIBES : DATING;
  const pickerValue = picker === "language" ? language : picker === "vibe" ? prefs.default_vibe : prefs.dating;
  const onPick = (v: string) => {
    if (picker === "language") setLanguage(v as Language);
    else if (picker === "vibe") savePrefs({ ...prefs, default_vibe: v as Vibe });
    else if (picker === "dating") savePrefs({ ...prefs, dating: v });
    setPicker(null);
  };

  return (
    <Screen testID="settings-page">
      <View style={styles.backHeader}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="settings-back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.backTitle}>Settings</Text>
      </View>

      {/* ACCOUNT */}
      <Text style={styles.sectionLabel}>ACCOUNT</Text>
      <Pressable
        style={styles.card}
        onPress={() => !isPro && router.push("/paywall")}
        testID="settings-account-row"
      >
        <View style={styles.row}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}
          >
            <Text style={styles.avatarText}>{(user?.email || "L").charAt(0).toUpperCase()}</Text>
          </LinearGradient>
          <Text style={styles.email} numberOfLines={1}>{user?.email || ""}</Text>
          {isPro ? (
            <View style={styles.proBadge}><Text style={styles.proBadgeText}>✦ PREMIUM</Text></View>
          ) : (
            <Text style={styles.chevron}>›</Text>
          )}
        </View>
      </Pressable>

      {/* PREFERENCES */}
      <Text style={styles.sectionLabel}>PREFERENCES</Text>
      <View style={styles.card}>
        <ValueRow label="Default language" value={language} onPress={() => setPicker("language")} testID="settings-row-language" />
        <View style={styles.divider} />
        <ValueRow label="Default vibe" value={prefs.default_vibe} onPress={() => setPicker("vibe")} testID="settings-row-vibe" />
        <View style={styles.divider} />
        <ValueRow label="I'm dating" value={prefs.dating} onPress={() => setPicker("dating")} testID="settings-row-dating" />
      </View>

      {/* NOTIFICATIONS */}
      <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
      <View style={styles.card}>
        <ToggleRow label="Date & birthday reminders" value={prefs.notif_reminders}
          onToggle={() => savePrefs({ ...prefs, notif_reminders: !prefs.notif_reminders })} testID="toggle-reminders" />
        <View style={styles.divider} />
        <ToggleRow label="Weekly check-in from Lovli" value={prefs.notif_checkin}
          onToggle={() => savePrefs({ ...prefs, notif_checkin: !prefs.notif_checkin })} testID="toggle-checkin" />
      </View>

      {/* PRIVACY */}
      <Text style={styles.sectionLabel}>PRIVACY</Text>
      <View style={styles.card}>
        <ToggleRow label="Lock with Face ID" value={prefs.face_id}
          onToggle={() => savePrefs({ ...prefs, face_id: !prefs.face_id })} testID="toggle-faceid" />
        <View style={styles.divider} />
        <ValueRow label="Delete my memories" value="" onPress={() => setConfirmOpen(true)} testID="settings-row-delete" />
      </View>

      {/* Footer */}
      <View style={[styles.card, { marginBottom: 32 }]}>
        <Pressable style={styles.footerRow} onPress={() => toast.success("Nothing to restore yet — payments open soon.")} testID="settings-restore">
          <Text style={styles.restoreText}>Restore purchases</Text>
        </Pressable>
        <View style={styles.divider} />
        <Pressable
          style={styles.footerRow}
          onPress={async () => { await logout(); router.replace("/login"); }}
          testID="settings-logout-button"
        >
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>

      {/* Picker sheet */}
      <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <Pressable style={styles.scrim} onPress={() => setPicker(null)} />
        <View style={styles.sheet} testID="settings-picker-sheet">
          {pickerOptions.map((o) => (
            <Pressable key={o} onPress={() => onPick(o)} style={[styles.option, pickerValue === o && styles.optionSelected]} testID={`picker-${o}`}>
              <Text style={[styles.optionText, pickerValue === o && styles.optionTextSelected]}>{o}</Text>
              {pickerValue === o ? (
                <View style={styles.check}><Ionicons name="checkmark" size={13} color="#050509" /></View>
              ) : null}
            </Pressable>
          ))}
        </View>
      </Modal>

      {/* Delete confirm */}
      <Modal visible={confirmOpen} transparent animationType="slide" onRequestClose={() => setConfirmOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setConfirmOpen(false)} />
        <View style={styles.sheet} testID="delete-confirm-sheet">
          <Text style={styles.sheetTitle}>Delete every memory?</Text>
          <Text style={styles.sheetSub}>
            {"Every person, timeline, and our chat thread — gone for good. Type DELETE to confirm."}
          </Text>
          <TextInput
            value={confirmText} onChangeText={setConfirmText} placeholder="DELETE"
            placeholderTextColor={colors.textFaint} autoCapitalize="characters"
            style={styles.confirmInput} testID="delete-confirm-input"
          />
          <Pressable
            onPress={deleteMemories}
            disabled={confirmText.trim().toUpperCase() !== "DELETE" || deleting}
            accessibilityState={{ disabled: confirmText.trim().toUpperCase() !== "DELETE" || deleting }}
            style={[styles.deleteCta, (confirmText.trim().toUpperCase() !== "DELETE" || deleting) && { opacity: 0.45 }]}
            testID="delete-confirm-button"
          >
            <Text style={styles.deleteCtaText}>{deleting ? "Deleting…" : "Delete everything"}</Text>
          </Pressable>
        </View>
      </Modal>
    </Screen>
  );
}

const ValueRow: React.FC<{ label: string; value: string; onPress: () => void; testID?: string }> = ({ label, value, onPress, testID }) => (
  <Pressable style={styles.valueRow} onPress={onPress} testID={testID}>
    <Text style={[styles.rowLabel, label === "Delete my memories" && { color: colors.pink }]}>{label}</Text>
    <View style={styles.valueRight}>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      <Text style={styles.chevron}>›</Text>
    </View>
  </Pressable>
);

// V2 toggle: 42×25 pill — on: lavender + glow, white knob right; off: hairline, faint knob left.
const ToggleRow: React.FC<{ label: string; value: boolean; onToggle: () => void; testID?: string }> = ({ label, value, onToggle, testID }) => (
  <Pressable style={styles.valueRow} onPress={onToggle} testID={testID} accessibilityRole="switch" accessibilityState={{ checked: value }}>
    <Text style={styles.rowLabel}>{label}</Text>
    <View style={[styles.toggle, value ? styles.toggleOn : styles.toggleOff]}>
      <View style={[styles.knob, value ? styles.knobOn : styles.knobOff]} />
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  backHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 8, marginBottom: 6 },
  backTitle: { fontFamily: typography.fonts.displaySemibold, fontSize: 20, letterSpacing: -0.3, color: colors.text },
  sectionLabel: {
    fontFamily: typography.fonts.bodyBold, fontSize: 12, letterSpacing: 1.2,
    textTransform: "uppercase", color: colors.textFaint, marginTop: 8,
  },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: 18, paddingHorizontal: 17 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  avatar: { width: 32, height: 32, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: typography.fonts.bodyBold, fontSize: 13, color: "#050509" },
  email: { ...typography.body.bodySemibold, fontSize: 14, color: colors.text, flex: 1 },
  proBadge: { backgroundColor: colors.lavender, borderRadius: radii.pill, paddingHorizontal: 9, paddingVertical: 3 },
  proBadgeText: { fontFamily: typography.fonts.bodyBold, fontSize: 10.5, color: "#050509" },
  valueRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13 },
  rowLabel: { ...typography.body.bodySemibold, fontSize: 14, color: colors.textSoft },
  valueRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  value: { ...typography.body.bodySemibold, fontSize: 13, color: colors.lavenderText },
  chevron: { color: colors.textDim, fontSize: 19 },
  divider: { height: 1, backgroundColor: colors.divider },
  toggle: { width: 42, height: 25, borderRadius: 999, justifyContent: "center", paddingHorizontal: 3 },
  toggleOn: {
    backgroundColor: colors.lavender,
    shadowColor: "#A78BFA", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 3,
  },
  toggleOff: { backgroundColor: colors.hairline },
  knob: { width: 19, height: 19, borderRadius: 999 },
  knobOn: { backgroundColor: "#FFFFFF", alignSelf: "flex-end" },
  knobOff: { backgroundColor: colors.textFaint, alignSelf: "flex-start" },
  footerRow: { paddingVertical: 14, alignItems: "flex-start" },
  restoreText: { ...typography.body.bodySemibold, fontSize: 14, color: colors.lavenderText },
  logoutText: { ...typography.body.bodySemibold, fontSize: 14, color: colors.pink },
  scrim: { flex: 1, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.surfaceRaised, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: colors.hairline, padding: 22, paddingBottom: 34, gap: 10,
  },
  sheetTitle: { fontFamily: typography.fonts.displaySemibold, fontSize: 20, color: colors.text },
  sheetSub: { ...typography.body.base, fontSize: 13.5, lineHeight: 19, color: colors.textMuted, marginBottom: 4 },
  option: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline,
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 17,
  },
  optionSelected: { backgroundColor: colors.surfaceRaised, borderWidth: 1.5, borderColor: colors.lavender },
  optionText: { ...typography.body.bodySemibold, fontSize: 14.5, color: colors.textSoft },
  optionTextSelected: { ...typography.body.bodyBold, color: colors.text },
  check: { width: 21, height: 21, borderRadius: 999, backgroundColor: colors.lavender, alignItems: "center", justifyContent: "center" },
  confirmInput: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: "rgba(224,102,122,0.4)",
    borderRadius: radii.input, paddingVertical: 13, paddingHorizontal: 15,
    ...typography.body.bodySemibold, fontSize: 15, color: colors.text, letterSpacing: 1,
  },
  deleteCta: {
    backgroundColor: colors.redFlag, borderRadius: radii.pill, alignItems: "center", paddingVertical: 15, marginTop: 4,
  },
  deleteCtaText: { ...typography.body.bodyBold, fontSize: 15, color: "#FFFFFF" },
});
