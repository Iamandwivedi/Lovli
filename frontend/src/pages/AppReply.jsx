import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AppShell from '@/components/AppShell';
import ChipGroup from '@/components/ChipGroup';
import ScreenshotUploader from '@/components/ScreenshotUploader';
import ReplyResultCard from '@/components/ReplyResultCard';
import UsageCounter from '@/components/UsageCounter';
import UpgradeModal from '@/components/UpgradeModal';
import LoadingState from '@/components/LoadingState';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { api, getLocalDateString, getLocalTimezone } from '@/lib/api';
import {
  PLATFORM_LABELS,
  platformLabelFromValue,
  platformValueFromLabel,
} from '@/lib/platform';
import { toast } from 'sonner';
import { Sparkles, Shield, ChevronDown, Sliders } from 'lucide-react';

const VIBES = ['Playful', 'Flirty', 'Sincere', 'Respectful', 'Confident'];
const LANGUAGES = ['English', 'Hinglish', 'Hindi + English mixed'];

const INPUT_CLS =
  'bg-lovli-card border-lovli-border text-lovli-text placeholder:text-lovli-text-faint';

export default function AppReply() {
  const { user, refreshMe, updateUser } = useAuth();

  const [image, setImage] = useState(null); // {file, previewUrl} or null
  const [manualText, setManualText] = useState('');
  const [userNote, setUserNote] = useState('');
  const [platformLabel, setPlatformLabel] = useState(
    platformLabelFromValue(user?.preferred_platform)
  );
  // Vibe is a per-chat choice (not an account preference). Always start at Playful.
  const [vibe, setVibe] = useState('Playful');
  // Language is per-chat too — defaults to the user's saved preference, but the user
  // can change it on the Reply screen for any individual generation. Changing it here
  // does NOT persist back to settings.
  const [language, setLanguage] = useState(
    user?.language_preference || 'Hinglish'
  );
  const [memoryCardId, setMemoryCardId] = useState('');
  const [memoryCards, setMemoryCards] = useState([]);

  // "Customize reply" is collapsed by default on every viewport — keeps the
  // page calm and lets the user open it only when they want fine control.
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const [usage, setUsage] = useState({
    daily_generation_count: user?.daily_generation_count || 0,
    daily_limit: 8,
    plan: user?.plan || 'free',
  });
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState(null); // { generation_id, replies, tone_notes }
  const [showUpgrade, setShowUpgrade] = useState(false);
  const resultsAnchor = useRef(null);

  const localDate = useMemo(() => getLocalDateString(), []);
  const tz = useMemo(() => getLocalTimezone(), []);

  // Initial fetch usage + memory cards
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/usage', { params: { client_local_date: localDate } });
        setUsage(data);
      } catch {
        /* noop */
      }
      try {
        const { data } = await api.get('/memory-cards');
        setMemoryCards(data || []);
      } catch {
        /* noop */
      }
    })();
  }, [localDate]);

  const remaining =
    usage.plan === 'pro'
      ? Infinity
      : Math.max(0, (usage.daily_limit ?? 8) - (usage.daily_generation_count ?? 0));

  // Summary shown under the "Customize reply" trigger when collapsed.
  const selectedMemoryNickname = useMemo(() => {
    if (!memoryCardId) return null;
    const m = memoryCards.find((c) => c.id === memoryCardId);
    return m?.nickname || null;
  }, [memoryCardId, memoryCards]);

  const customizeSummary = useMemo(() => {
    const parts = [platformLabel, vibe, selectedMemoryNickname || 'No memory'];
    return parts.filter(Boolean).join(' • ');
  }, [platformLabel, vibe, selectedMemoryNickname]);

  const doGenerate = useCallback(async () => {
    if (!image && !manualText.trim()) {
      toast.error('Upload a screenshot or paste the chat first.');
      return;
    }
    if (usage.plan === 'free' && remaining <= 0) {
      setShowUpgrade(true);
      return;
    }
    try {
      setGenerating(true);
      const fd = new FormData();
      fd.append('platform', platformValueFromLabel(platformLabel));
      fd.append('vibe', vibe);
      fd.append('language', language);
      fd.append('client_local_date', localDate);
      fd.append('timezone', tz);
      if (manualText.trim()) fd.append('manual_text', manualText.trim());
      if (userNote.trim()) fd.append('user_note', userNote.trim());
      if (memoryCardId) fd.append('memory_card_id', memoryCardId);
      if (image?.file) fd.append('image', image.file);

      const { data } = await api.post('/generate-replies', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResults({
        generation_id: data.generation_id,
        replies: data.replies,
        tone_notes: data.tone_notes,
      });
      setUsage({
        daily_generation_count: data.daily_generation_count,
        daily_limit: data.daily_limit,
        plan: data.plan,
      });
      // Sync user.daily_generation_count for header/badge
      updateUser({
        ...user,
        daily_generation_count: data.daily_generation_count,
        last_generation_reset_date: localDate,
      });
      // smooth scroll to results
      setTimeout(() => {
        resultsAnchor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 429) {
        setShowUpgrade(true);
      } else if (status === 503) {
        toast.error("Lovli couldn’t generate replies right now. Try again.");
      } else {
        toast.error(err?.response?.data?.detail || "Lovli couldn’t generate replies right now. Try again.");
      }
    } finally {
      setGenerating(false);
    }
  }, [image, manualText, usage.plan, remaining, platformLabel, vibe, language, localDate, tz, userNote, memoryCardId, updateUser, user]);

  const onRegenerate = useCallback(
    async () => {
      if (usage.plan === 'free' && remaining <= 1) {
        const ok = window.confirm('This will use 1 generation. Continue?');
        if (!ok) return;
      }
      await doGenerate();
    },
    [doGenerate, usage.plan, remaining]
  );

  return (
    <AppShell>
      <div data-testid="reply-page">
        <div className="mt-1">
          <h1 className="font-display text-[26px] font-semibold leading-tight text-lovli-text">
            Stuck on what to reply?
          </h1>
          <p className="mt-1.5 text-[14px] leading-relaxed text-lovli-text-muted">
            Upload the chat, choose language, and get 3 natural replies.
          </p>
        </div>

        <section className="mt-5 lovli-glass rounded-2xl p-4 sm:p-5 space-y-5">
          {/* 1. Upload screenshot — primary visual focus */}
          <ScreenshotUploader value={image} onChange={setImage} />

          {/* 2. Manual chat input */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-lovli-text-soft" htmlFor="paste-textarea">
              Or paste the chat
            </label>
            <Textarea
              id="paste-textarea"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Paste the chat or explain the situation…"
              rows={3}
              data-testid="reply-paste-textarea"
              className={INPUT_CLS}
            />
          </div>

          {/* 3. Reply language — per-chat, always visible */}
          <div className="space-y-2">
            <p className="text-[12px] font-medium text-lovli-text-soft">Reply language</p>
            <ChipGroup
              options={LANGUAGES}
              value={language}
              onChange={setLanguage}
              testId="reply-language-toggle"
              ariaLabel="Reply language"
            />
          </div>

          {/* 4. Customize reply — collapsible (platform, vibe, memory + optional note) */}
          <div data-testid="reply-customize-section">
            <button
              type="button"
              onClick={() => setCustomizeOpen((v) => !v)}
              aria-expanded={customizeOpen}
              aria-controls="reply-customize-content"
              data-testid="reply-customize-toggle"
              className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-lovli-border bg-lovli-card px-3.5 py-3 text-left transition-colors hover:bg-lovli-card-2 hover:border-lovli-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lovli-lavender/55"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-lovli-lavender/30 bg-lovli-lavender/10">
                  <Sliders className="h-3.5 w-3.5 text-lovli-lavender" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-lovli-text">
                    Customize reply
                  </span>
                  <span
                    className="block truncate text-[11.5px] text-lovli-text-muted"
                    data-testid="reply-customize-summary"
                  >
                    {customizeOpen ? 'Platform, vibe, and memory' : customizeSummary}
                  </span>
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-lovli-text-muted transition-transform duration-200 ${
                  customizeOpen ? 'rotate-180 text-lovli-lavender' : ''
                }`}
              />
            </button>

            <AnimatePresence initial={false}>
              {customizeOpen && (
                <motion.div
                  key="customize-content"
                  id="reply-customize-content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-5 pt-4">
                    {/* Platform */}
                    <div className="space-y-2">
                      <p className="text-[12px] font-medium text-lovli-text-soft">Platform</p>
                      <ChipGroup
                        options={PLATFORM_LABELS}
                        value={platformLabel}
                        onChange={setPlatformLabel}
                        testId="reply-platform-toggle"
                        ariaLabel="Platform"
                      />
                    </div>

                    {/* Vibe */}
                    <div className="space-y-2">
                      <p className="text-[12px] font-medium text-lovli-text-soft">Vibe</p>
                      <ChipGroup
                        options={VIBES}
                        value={vibe}
                        onChange={setVibe}
                        testId="reply-vibe-toggle"
                        ariaLabel="Vibe"
                      />
                    </div>

                    {/* Memory (optional) */}
                    <div className="space-y-1.5">
                      <p className="text-[12px] font-medium text-lovli-text-soft">
                        Personalize with memory{' '}
                        <span className="text-lovli-text-faint font-normal">(optional)</span>
                      </p>
                      {memoryCards.length > 0 ? (
                        <Select
                          value={memoryCardId || 'none'}
                          onValueChange={(v) => setMemoryCardId(v === 'none' ? '' : v)}
                        >
                          <SelectTrigger
                            data-testid="reply-memory-select"
                            className="bg-lovli-card border-lovli-border text-lovli-text"
                          >
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent className="bg-lovli-card-2 border-lovli-border text-lovli-text">
                            <SelectItem value="none">None</SelectItem>
                            {memoryCards.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.nickname}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p
                          className="rounded-xl border border-lovli-border bg-lovli-card px-3 py-2.5 text-[12px] text-lovli-text-muted"
                          data-testid="reply-memory-empty"
                        >
                          No memories yet — add one from the Memory tab to personalize replies.
                        </p>
                      )}
                    </div>

                    {/* Optional note — kept inside Customize so the main screen stays calm */}
                    <div className="space-y-1.5">
                      <label
                        className="text-[12px] font-medium text-lovli-text-soft"
                        htmlFor="note-textarea"
                      >
                        Quick note{' '}
                        <span className="text-lovli-text-faint font-normal">(optional)</span>
                      </label>
                      <Textarea
                        id="note-textarea"
                        value={userNote}
                        onChange={(e) => setUserNote(e.target.value)}
                        placeholder="e.g. keep it light, not nervous; we matched yesterday"
                        rows={2}
                        data-testid="reply-note-textarea"
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 5. Usage + privacy */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <UsageCounter
              used={usage.daily_generation_count}
              limit={usage.daily_limit}
              plan={usage.plan}
            />
            <span className="inline-flex items-center gap-1 text-[11px] text-lovli-text-muted">
              <Shield className="h-3 w-3" /> Private
            </span>
          </div>

          {/* 6. Generate replies CTA */}
          <Button
            type="button"
            disabled={generating}
            onClick={doGenerate}
            className="w-full lovli-cta min-h-[50px] rounded-full text-[15px] font-semibold"
            data-testid="generate-replies-button"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {generating ? 'Generating…' : 'Generate replies'}
          </Button>
        </section>

        <div ref={resultsAnchor} className="mt-6" />

        <AnimatePresence mode="wait">
          {generating && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="lovli-glass rounded-2xl p-7"
            >
              <LoadingState />
            </motion.div>
          )}

          {!generating && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              className="space-y-4"
              data-testid="reply-results"
            >
              <div data-testid="reply-results-heading">
                <h2 className="font-display text-[18px] font-semibold text-lovli-text">
                  Choose a reply
                </h2>
                <p className="mt-0.5 text-[13px] text-lovli-text-muted">
                  Edit it if you want. Make it yours.
                </p>
              </div>

              {results.tone_notes && (
                <div
                  className="text-[11.5px] text-lovli-text-muted"
                  data-testid="reply-tone-notes"
                >
                  Tone read: {results.tone_notes}
                </div>
              )}

              <div className="space-y-3">
                {results.replies.map((r, i) => (
                  <ReplyResultCard
                    key={`${results.generation_id}-${i}`}
                    reply={r}
                    index={i}
                    vibe={vibe}
                    generationId={results.generation_id}
                    onRegenerate={onRegenerate}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {!generating && !results && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="lovli-glass rounded-2xl p-6 text-center"
              data-testid="reply-empty-state"
            >
              <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-lovli-lavender/35 bg-lovli-lavender/10">
                <Sparkles className="h-4 w-4 text-lovli-lavender" />
              </div>
              <p className="text-[14px] text-lovli-text">
                Upload a chat screenshot to get started.
              </p>
              <p className="mt-1 text-[12px] text-lovli-text-muted">
                Lovli reads the vibe and gives you 3 natural reply options.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <UpgradeModal
        open={showUpgrade}
        onClose={() => {
          setShowUpgrade(false);
          // refresh usage in case server reset already
          refreshMe();
        }}
        user={user}
      />
    </AppShell>
  );
}
