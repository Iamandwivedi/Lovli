// Memory · Timeline / person detail — V3 dark glass.
import React, { useCallback, useMemo, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "@/src/components/Screen";
import { useToast } from "@/src/context/ToastContext";
import {
  MemoryCard,
  TimelineEntry,
  listMemoryCards,
  patchMemoryCard,
} from "@/src/api/endpoints";
import { resyncNotificationsFromStorage } from "@/src/utils/notifications";
import { colors, radii, typography } from "@/src/theme";

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const niceDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export default function PersonDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [card, setCard] = useState<MemoryCard | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [detail, setDetail] = useState("");
  const [upcoming, setUpcoming] = useState(false);
  const [dateIso, setDateIso] = useState(""); // optional real date (reminders)
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const cards = await listMemoryCards();
      setCard(cards.find((c) => c.id === id) || null);
    } catch {
      // silent
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // upcoming entries sort last
  const timeline = useMemo(() => {
    const t = card?.timeline || [];
    return [...t.filter((e) => !e.upcoming), ...t.filter((e) => e.upcoming)];
  }, [card]);

  const addMoment = async () => {
    if (!card || !title.trim()) return;
    setSaving(true);
    try {
      const validIso = ISO_RE.test(dateIso.trim()) ? dateIso.trim() : null;
      const entry: TimelineEntry = {
        title: title.trim(),
        // free text wins; a picked date auto-fills the label when empty
        date_label: dateLabel.trim() || (validIso ? niceDate(validIso) : null),
        date: validIso,
        detail: detail.trim() || null,
        upcoming,
      };
      const updated = await patchMemoryCard(card.id, {
        timeline: [...(card.timeline || []), entry],
      });
      setCard(updated);
      setSheetOpen(false);
      setTitle(""); setDateLabel(""); setDetail(""); setUpcoming(false);
      setDateIso(""); setShowPicker(false);
      toast.success("Moment saved.");
      resyncNotificationsFromStorage(); // new upcoming date → reschedule
    } catch {
      toast.error("Could not save that moment.");
    } finally {
      setSaving(false);
    }
  };

  if (!card) return <Screen testID="person-detail-page">{null}</Screen>;

  const stagePill = card.stage
    ? `${card.stage}${card.stage_duration ? ` · ${card.stage_duration}` : ""}`
    : card.relationship_stage || null;
  const meta = [card.platform, card.city].filter(Boolean).join(" · ");

  return (
    <Screen scroll={false} testID="person-detail-page">
      {/* Header row */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="person-back-button">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => router.push(`/memory/edit/${card.id}`)} hitSlop={10} testID="person-edit-button">
          <Text style={styles.editText}>Edit</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Person header */}
        <View style={styles.personHeader}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{card.nickname.charAt(0).toUpperCase()}</Text>
          </LinearGradient>
          <Text style={styles.name}>{card.nickname}</Text>
          <View style={styles.metaRow}>
            {stagePill ? (
              <View style={styles.stagePill}>
                <Text style={styles.stagePillText}>{stagePill}</Text>
              </View>
            ) : null}
            {meta ? <Text style={styles.meta}>{meta}</Text> : null}
          </View>
        </View>

        {/* Timeline */}
        <Text style={styles.sectionLabel}>YOUR STORY SO FAR</Text>
        {timeline.map((e, i) => (
          <View key={i} style={styles.timelineRow}>
            <View style={styles.timelineLeft}>
              <View style={[styles.dot, e.upcoming && styles.dotUpcoming]} />
              {i < timeline.length - 1 ? <View style={styles.line} /> : null}
            </View>
            <View style={styles.timelineBody}>
              <Text style={styles.entryTitle}>{e.title}</Text>
              {e.date_label || e.detail ? (
                <Text style={styles.entryDetail}>
                  {[e.date_label, e.detail].filter(Boolean).join(" — ")}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
        <Pressable onPress={() => setSheetOpen(true)} style={styles.addMoment} testID="add-moment-button">
          <Ionicons name="add" size={14} color={colors.lavenderText} />
          <Text style={styles.addMomentText}>Add a moment</Text>
        </Pressable>

        {/* Facts */}
        {(card.facts || []).length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 26 }]}>THE LITTLE THINGS</Text>
            <View style={styles.chipsRow}>
              {(card.facts || []).map((f, i) => (
                <View key={i} style={[styles.factChip, f.kind === "avoid" && styles.factChipAvoid]}>
                  <Text style={[styles.factText, f.kind === "avoid" && styles.factTextAvoid]}>
                    {f.kind === "avoid" ? `Avoid: ${f.text}` : f.text}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Add-a-moment sheet */}
      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setSheetOpen(false)} />
        <View style={styles.sheet} testID="add-moment-sheet">
          <Text style={styles.sheetTitle}>Add a moment</Text>
          <TextInput
            value={title} onChangeText={setTitle} placeholder="What happened? *"
            placeholderTextColor={colors.textFaint} style={styles.sheetInput} testID="moment-title-input"
          />
          <TextInput
            value={dateLabel} onChangeText={setDateLabel} placeholder='Date label (e.g. "June 21")'
            placeholderTextColor={colors.textFaint} style={styles.sheetInput} testID="moment-date-input"
          />
          {/* Optional REAL date — powers local reminders (label stays free text) */}
          {Platform.OS === "web" ? (
            <TextInput
              value={dateIso} onChangeText={setDateIso}
              placeholder="Real date for reminders (optional) — YYYY-MM-DD"
              placeholderTextColor={colors.textFaint} style={styles.sheetInput}
              testID="moment-date-iso-input"
            />
          ) : (
            <Pressable
              onPress={() => setShowPicker((v) => !v)}
              style={styles.sheetDateBtn}
              testID="moment-date-picker-button"
            >
              <Text style={[styles.sheetDateText, { color: dateIso ? colors.text : colors.textFaint }]}>
                {dateIso ? `Reminder date: ${niceDate(dateIso)}` : "Real date for reminders (optional)"}
              </Text>
            </Pressable>
          )}
          {showPicker && Platform.OS !== "web" ? (
            <DateTimePicker
              value={ISO_RE.test(dateIso) ? new Date(dateIso) : new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_e: unknown, d?: Date) => {
                if (Platform.OS !== "ios") setShowPicker(false);
                if (d) setDateIso(toIso(d));
              }}
            />
          ) : null}
          <TextInput
            value={detail} onChangeText={setDetail} placeholder="Detail (optional)"
            placeholderTextColor={colors.textFaint} style={styles.sheetInput} testID="moment-detail-input"
          />
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Upcoming</Text>
            <Switch
              value={upcoming} onValueChange={setUpcoming}
              trackColor={{ false: colors.hairline, true: colors.lavender }}
              thumbColor="#FFFFFF" testID="moment-upcoming-toggle"
            />
          </View>
          <Pressable
            onPress={addMoment} disabled={!title.trim() || saving}
            style={[styles.sheetCta, (!title.trim() || saving) && { opacity: 0.45 }]}
            testID="moment-save-button"
          >
            <Text style={styles.sheetCtaText}>{saving ? "Saving…" : "Save moment"}</Text>
          </Pressable>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 8 },
  editText: { ...typography.body.bodySemibold, fontSize: 13.5, color: colors.lavenderText },
  personHeader: { alignItems: "center", marginTop: 10, marginBottom: 26 },
  avatar: {
    width: 56, height: 56, borderRadius: 999, alignItems: "center", justifyContent: "center",
    shadowColor: "#A78BFA", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 26, elevation: 6,
  },
  avatarText: { fontFamily: typography.fonts.bodyBold, fontSize: 21, color: "#050509" },
  name: { fontFamily: typography.fonts.displayBold, fontSize: 24, letterSpacing: 0, color: colors.text, marginTop: 12 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  stagePill: { backgroundColor: colors.violetTint, borderWidth: 1, borderColor: colors.violetTintBorder, borderRadius: radii.pill, paddingHorizontal: 11, paddingVertical: 4 },
  stagePillText: { fontFamily: typography.fonts.bodyBold, fontSize: 11.5, color: colors.lavenderText },
  meta: { ...typography.body.caption, fontSize: 12, color: colors.textFaint },
  sectionLabel: {
    fontFamily: typography.fonts.bodyBold, fontSize: 12, letterSpacing: 1.2,
    textTransform: "uppercase", color: colors.textFaint, marginBottom: 14,
  },
  timelineRow: { flexDirection: "row", gap: 14 },
  timelineLeft: { alignItems: "center", width: 12 },
  dot: {
    width: 11, height: 11, borderRadius: 999, backgroundColor: colors.lavender, marginTop: 3,
    shadowColor: "#A78BFA", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 10, elevation: 3,
  },
  dotUpcoming: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.lavender, shadowOpacity: 0 },
  line: { width: 1.5, flex: 1, backgroundColor: colors.hairline, marginVertical: 3 },
  timelineBody: { flex: 1, paddingBottom: 18 },
  entryTitle: { ...typography.body.bodySemibold, fontSize: 14, color: colors.text },
  entryDetail: { ...typography.body.caption, fontSize: 12.5, color: colors.textFaint, marginTop: 3 },
  addMoment: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 8 },
  addMomentText: { ...typography.body.bodySemibold, fontSize: 13, color: colors.lavenderText },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  factChip: { backgroundColor: colors.violetTint, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 6, maxWidth: 240 },
  factChipAvoid: { backgroundColor: colors.roseTint },
  factText: { ...typography.body.bodyMedium, fontSize: 12.5, color: colors.lavenderText },
  factTextAvoid: { color: colors.pink },
  scrim: { flex: 1, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.surfaceRaised, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: colors.hairline, padding: 22, paddingBottom: 34, gap: 12,
  },
  sheetTitle: { fontFamily: typography.fonts.displaySemibold, fontSize: 20, color: colors.text, marginBottom: 4 },
  sheetInput: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline,
    borderRadius: radii.input, paddingVertical: 13, paddingHorizontal: 15,
    ...typography.body.base, fontSize: 14.5, color: colors.text,
  },
  sheetDateBtn: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline,
    borderRadius: radii.input, paddingVertical: 13, paddingHorizontal: 15,
  },
  sheetDateText: { ...typography.body.base, fontSize: 14.5 },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  toggleLabel: { ...typography.body.bodySemibold, fontSize: 14, color: colors.textSoft },
  sheetCta: {
    backgroundColor: "#FFFFFF", borderRadius: radii.pill, alignItems: "center",
    paddingVertical: 15, marginTop: 4,
  },
  sheetCtaText: { ...typography.body.bodyBold, fontSize: 15, color: "#050509" },
});
