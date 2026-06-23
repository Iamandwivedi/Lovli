import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { MotiView } from 'moti';
import { Screen, Header, PrimaryCTA, SegmentedControl, Chip, Card, ErrorBanner, Icon } from '../../src/components/ui';
import { colors, typography, spacing, radius } from '../../src/theme';
import {
  PLATFORMS,
  LANGUAGES,
  VIBES,
  EXAMPLE_CHAT,
  TRUST_PHRASES,
} from '../../src/constants/product';
import type { Platform as LovliPlatform, Language, Vibe } from '../../src/constants/product';
import { generateReplies } from '../../src/services/generationApi';
import { getToken, deleteToken } from '../../src/lib/storage';
import { localDateString, ianaTimezone } from '../../src/lib/date';
import { extractErrorMessage, ApiError } from '../../src/lib/errors';

const SIGN_IN_PROMPT = 'Please sign in to generate replies.';

type InputMode = 'screenshot' | 'paste';

export default function ReplyScreen() {
  const router = useRouter();
  const sheetRef = useRef<BottomSheet>(null);

  const [inputMode, setInputMode] = useState<InputMode>('screenshot');
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [isFirstRun, setIsFirstRun] = useState(true);

  const [platform, setPlatform] = useState<LovliPlatform>('Instagram');
  const [vibe, setVibe] = useState<Vibe>('Playful');
  const [language, setLanguage] = useState<Language>('Hinglish');
  const [userNote, setUserNote] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasInput = inputMode === 'screenshot' ? !!screenshotUri : pasteText.trim().length > 0;

  const pickScreenshot = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Photo access needed to upload a screenshot.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setScreenshotUri(result.assets[0].uri);
      setIsFirstRun(false);
      setError('');
    }
  }, []);

  const tryExample = useCallback(() => {
    setInputMode('paste');
    setPasteText(EXAMPLE_CHAT);
    setIsFirstRun(false);
  }, []);

  const openCustomize = useCallback(() => {
    sheetRef.current?.expand();
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!hasInput) return;

    // Generation is a protected endpoint — require a stored JWT before calling.
    const token = await getToken();
    if (!token) {
      setError(SIGN_IN_PROMPT);
      router.push('/auth/login');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await generateReplies({
        platform,
        vibe,
        language,
        timezone: ianaTimezone(),
        client_local_date: localDateString(),
        imageUri: inputMode === 'screenshot' ? screenshotUri ?? undefined : undefined,
        manual_text: inputMode === 'paste' ? pasteText : undefined,
        user_note: userNote || undefined,
      });
      router.push({
        pathname: '/results',
        params: { data: JSON.stringify(result), platform, vibe, language },
      });
    } catch (err) {
      if (err instanceof ApiError && err.isLimitReached) {
        router.push('/limit-reached');
      } else if (err instanceof ApiError && (err.statusCode === 401 || err.statusCode === 403)) {
        await deleteToken();
        setError(SIGN_IN_PROMPT);
        router.push('/auth/login');
      } else {
        setError(extractErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, [hasInput, platform, vibe, language, inputMode, screenshotUri, pasteText, userNote]);

  return (
    <Screen edges={['top']}>
      <Header plan="free" onSettingsPress={() => router.push('/settings')} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error ? <ErrorBanner message={error} onDismiss={() => setError('')} /> : null}

          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Stuck on what to reply?</Text>
            <Text style={styles.heroSub}>
              Upload the chat, choose language, and get 3 natural replies.
            </Text>
          </View>

          <View style={styles.modeRail}>
            <SegmentedControl
              options={['Screenshot', 'Paste']}
              value={inputMode === 'screenshot' ? 'Screenshot' : 'Paste'}
              onChange={v => setInputMode(v === 'Screenshot' ? 'screenshot' : 'paste')}
            />
          </View>

          <Card variant="float" style={styles.canvas}>
            {inputMode === 'screenshot' ? (
              <ScreenshotCanvas
                uri={screenshotUri}
                isFirstRun={isFirstRun}
                onPick={pickScreenshot}
                onRemove={() => setScreenshotUri(null)}
                onTryExample={tryExample}
              />
            ) : (
              <PasteCanvas
                value={pasteText}
                onChange={setPasteText}
                onTryExample={tryExample}
              />
            )}
          </Card>

          <Text style={styles.privacy}>{TRUST_PHRASES.screenshotNeverStored}</Text>

          <Pressable style={styles.customizeRow} onPress={openCustomize}>
            <Text style={styles.customizeLabel}>
              {platform} · {vibe} · {language}
            </Text>
            <Icon name="chevron-right" size={18} color={colors.textMuted} />
          </Pressable>
        </ScrollView>

        <View style={styles.ctaZone}>
          <PrimaryCTA
            label="Get my replies"
            onPress={handleGenerate}
            loading={loading}
            disabled={!hasInput}
          />
          <Text style={styles.ctaMeta}>
            8 free today · {TRUST_PHRASES.privateByDesign}
          </Text>
          {/* Quiet upgrade nudge — hide when user.plan === 'pro' once auth context provides it */}
          <Pressable style={styles.unlimitedRow} onPress={() => router.push('/pro')}>
            <Text style={styles.unlimitedLabel}>Get unlimited replies</Text>
            <Icon name="chevron-right" size={16} color={colors.lavenderSoft} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={['70%']}
        enablePanDownToClose
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.6} />
        )}
        backgroundStyle={{ backgroundColor: colors.float, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <CustomizeSheet
            platform={platform}
            vibe={vibe}
            language={language}
            userNote={userNote}
            onPlatformChange={setPlatform}
            onVibeChange={setVibe}
            onLanguageChange={setLanguage}
            onNoteChange={setUserNote}
            onDone={() => sheetRef.current?.close()}
          />
        </BottomSheetView>
      </BottomSheet>
    </Screen>
  );
}

function ScreenshotCanvas({ uri, isFirstRun, onPick, onRemove, onTryExample }: {
  uri: string | null; isFirstRun: boolean;
  onPick: () => void; onRemove: () => void; onTryExample: () => void;
}) {
  if (uri) {
    return (
      <View style={styles.screenshotContainer}>
        <MotiView
          from={{ scale: 1.05, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'timing', duration: 320 }}
        >
          <Image source={{ uri }} style={styles.screenshotImage} resizeMode="contain" />
        </MotiView>
        <Pressable style={styles.removeChip} onPress={onRemove}>
          <Icon name="x" size={12} color={colors.textMuted} />
          <Text style={styles.removeChipText}>Remove</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <Pressable style={styles.uploadZone} onPress={onPick}>
      <View style={styles.uploadIconWrap}>
        <Icon name="image" size={24} color={colors.lavender} />
      </View>
      <Text style={styles.uploadLabel}>Upload a screenshot</Text>
      <Text style={styles.uploadSub}>JPG, PNG or WEBP · max 6MB</Text>
      {isFirstRun && (
        <Pressable style={styles.exampleLink} onPress={onTryExample}>
          <Text style={styles.exampleLinkText}>No screenshot? Try an example</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

function PasteCanvas({ value, onChange, onTryExample }: {
  value: string; onChange: (t: string) => void; onTryExample: () => void;
}) {
  return (
    <View style={styles.pasteContainer}>
      {value.trim().length === 0 ? (
        <Pressable style={styles.uploadZone} onPress={onTryExample}>
          <View style={styles.uploadIconWrap}>
            <Icon name="message-square" size={24} color={colors.lavender} />
          </View>
          <Text style={styles.uploadLabel}>Paste your chat here</Text>
          <Text style={styles.uploadSub}>Copy the last few messages and paste below</Text>
          <View style={styles.exampleLink}>
            <Text style={styles.exampleLinkText}>Or try an example</Text>
          </View>
        </Pressable>
      ) : (
        <View style={styles.bubbleList}>
          {value.trim().split('\n').filter(Boolean).map((line, i) => (
            <View key={i} style={[styles.bubble, i % 2 === 0 ? styles.bubbleTheirs : styles.bubbleYours]}>
              <Text style={styles.bubbleText}>{line}</Text>
            </View>
          ))}
        </View>
      )}
      <TextInput
        style={styles.pasteInput}
        multiline
        placeholder="Paste chat messages here…"
        placeholderTextColor={colors.textFaint}
        value={value}
        onChangeText={onChange}
        textAlignVertical="top"
      />
    </View>
  );
}

function CustomizeSheet({ platform, vibe, language, userNote, onPlatformChange, onVibeChange, onLanguageChange, onNoteChange, onDone }: {
  platform: string; vibe: string; language: string; userNote: string;
  onPlatformChange: (v: any) => void; onVibeChange: (v: any) => void;
  onLanguageChange: (v: any) => void; onNoteChange: (v: string) => void; onDone: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.sheetScroll} showsVerticalScrollIndicator={false}>
      <Text style={styles.sheetTitle}>Customize</Text>
      <Text style={styles.sheetLabel}>Platform</Text>
      <SegmentedControl options={PLATFORMS} value={platform} onChange={onPlatformChange} scrollable />
      <Text style={styles.sheetLabel}>Vibe</Text>
      <View style={styles.chipRow}>
        {VIBES.map(v => (
          <Chip key={v} label={v} active={vibe === v} onPress={() => onVibeChange(v)} />
        ))}
      </View>
      <Text style={styles.sheetLabel}>Language</Text>
      <SegmentedControl options={LANGUAGES} value={language} onChange={onLanguageChange} scrollable />
      <Text style={styles.sheetLabel}>Quick note (optional)</Text>
      <TextInput
        style={styles.noteInput}
        multiline
        numberOfLines={3}
        placeholder="e.g. we met at a wedding last week"
        placeholderTextColor={colors.textFaint}
        value={userNote}
        onChangeText={onNoteChange}
      />
      <PrimaryCTA label="Done" onPress={onDone} style={{ marginTop: spacing[4] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing[6], paddingHorizontal: spacing[4], gap: spacing[3] },
  hero: { marginTop: spacing[1], gap: spacing[1] },
  heroTitle: { ...typography.title, color: colors.text },
  heroSub: { ...typography.body, color: colors.textMuted },
  modeRail: { marginTop: spacing[1] },
  canvas: { borderRadius: radius.canvas, overflow: 'hidden', minHeight: 200 },
  privacy: { ...typography.meta, color: colors.textFaint, textAlign: 'center', fontSize: 12 },
  customizeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.row,
    borderWidth: 1, borderColor: colors.hairline,
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
  },
  customizeLabel: { ...typography.meta, color: colors.textMuted, fontSize: 13 },
  ctaZone: {
    paddingHorizontal: spacing[4], paddingBottom: spacing[4], paddingTop: spacing[3],
    gap: spacing[2], borderTopWidth: 1, borderTopColor: colors.hairline, backgroundColor: colors.bg,
  },
  ctaMeta: { ...typography.meta, color: colors.textFaint, textAlign: 'center', fontSize: 12 },
  unlimitedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    marginTop: spacing[1],
  },
  unlimitedLabel: { ...typography.meta, color: colors.lavenderSoft, fontSize: 13 },
  screenshotContainer: { alignItems: 'center', padding: spacing[4], gap: spacing[3] },
  screenshotImage: { width: 148, height: 196, borderRadius: 12 },
  removeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  removeChipText: { ...typography.meta, color: colors.textMuted, fontSize: 12 },
  uploadZone: { alignItems: 'center', padding: spacing[6], gap: spacing[2] },
  uploadIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(167,139,250,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.20)',
    marginBottom: spacing[1],
  },
  uploadLabel: { ...typography.bodyMedium, color: colors.textSoft },
  uploadSub: { ...typography.meta, color: colors.textFaint, fontSize: 12 },
  exampleLink: { marginTop: spacing[2], paddingHorizontal: spacing[4], paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)', backgroundColor: 'rgba(167,139,250,0.06)' },
  exampleLinkText: { ...typography.meta, color: colors.lavender, fontSize: 13 },
  pasteContainer: { padding: spacing[3], gap: spacing[3] },
  bubbleList: { gap: spacing[2] },
  bubble: { maxWidth: '80%', borderRadius: 14, padding: spacing[3] },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline },
  bubbleYours: { alignSelf: 'flex-end', borderWidth: 1, borderColor: colors.lavender, backgroundColor: 'rgba(167,139,250,0.08)' },
  bubbleText: { ...typography.body, color: colors.textSoft },
  pasteInput: { ...typography.body, color: colors.text, minHeight: 80, borderTopWidth: 1, borderTopColor: colors.hairline, paddingTop: spacing[3] },
  sheetContent: { flex: 1 },
  sheetScroll: { padding: spacing[4], paddingBottom: spacing[8], gap: spacing[4] },
  sheetTitle: { ...typography.title, color: colors.text, marginBottom: spacing[2] },
  sheetLabel: { ...typography.inputLabel, color: colors.textMuted, marginBottom: spacing[1] },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  noteInput: { ...typography.body, color: colors.text, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.hairline, padding: spacing[3], minHeight: 80, textAlignVertical: 'top' },
});
