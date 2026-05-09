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
import { Sparkles, Shield } from 'lucide-react';

const VIBES = ['Playful', 'Flirty', 'Sincere', 'Respectful', 'Confident'];
const LANGUAGES = ['English', 'Hinglish', 'Hindi + English mixed'];

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
        <div className="mt-2">
          <h1 className="font-display text-2xl font-semibold text-white">
            Stuck on what to reply?
          </h1>
          <p className="mt-1 text-sm text-white/65">
            Upload the chat, choose your vibe, and get 3 natural replies.
          </p>
        </div>

        <section className="mt-4 lovli-glass rounded-2xl p-4 space-y-4">
          <ScreenshotUploader value={image} onChange={setImage} />

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/70" htmlFor="paste-textarea">
              Or paste chat manually
            </label>
            <Textarea
              id="paste-textarea"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Paste the chat or explain the situation…"
              rows={4}
              data-testid="reply-paste-textarea"
              className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/40"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/70" htmlFor="note-textarea">
              Add a quick note (optional)
            </label>
            <Textarea
              id="note-textarea"
              value={userNote}
              onChange={(e) => setUserNote(e.target.value)}
              placeholder="e.g. keep it light, not nervous; we matched yesterday"
              rows={2}
              data-testid="reply-note-textarea"
              className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/40"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-white/70">Platform</p>
            <ChipGroup
              options={PLATFORM_LABELS}
              value={platformLabel}
              onChange={setPlatformLabel}
              testId="reply-platform-toggle"
              ariaLabel="Platform"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-white/70">Vibe</p>
            <ChipGroup
              options={VIBES}
              value={vibe}
              onChange={setVibe}
              testId="reply-vibe-toggle"
              ariaLabel="Vibe"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-white/70">Reply language</p>
            <ChipGroup
              options={LANGUAGES}
              value={language}
              onChange={setLanguage}
              testId="reply-language-toggle"
              ariaLabel="Reply language"
            />
          </div>

          {memoryCards.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-white/70">Personalize with a memory card (optional)</p>
              <Select value={memoryCardId || 'none'} onValueChange={(v) => setMemoryCardId(v === 'none' ? '' : v)}>
                <SelectTrigger
                  data-testid="reply-memory-select"
                  className="bg-white/[0.04] border-white/10 text-white"
                >
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent className="bg-[#0B0D1A] border-white/12 text-white">
                  <SelectItem value="none">None</SelectItem>
                  {memoryCards.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nickname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <UsageCounter used={usage.daily_generation_count} limit={usage.daily_limit} plan={usage.plan} />
            <span className="inline-flex items-center gap-1 text-[11px] text-white/50">
              <Shield className="h-3 w-3" /> Private
            </span>
          </div>

          <Button
            type="button"
            disabled={generating}
            onClick={doGenerate}
            className="w-full lovli-cta min-h-[48px] rounded-xl text-sm font-semibold"
            data-testid="generate-replies-button"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {generating ? 'Generating…' : 'Generate replies'}
          </Button>
        </section>

        <div ref={resultsAnchor} className="mt-5" />

        <AnimatePresence mode="wait">
          {generating && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="lovli-glass rounded-2xl p-6"
            >
              <LoadingState />
            </motion.div>
          )}

          {!generating && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="space-y-3"
              data-testid="reply-results"
            >
              {results.tone_notes && (
                <div className="text-xs text-white/55" data-testid="reply-tone-notes">
                  Tone: {results.tone_notes}
                </div>
              )}
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
            </motion.div>
          )}

          {!generating && !results && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="lovli-glass rounded-2xl p-5 text-center"
              data-testid="reply-empty-state"
            >
              <div className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                <Sparkles className="h-4 w-4 text-white/85" />
              </div>
              <p className="text-sm text-white/85">Upload a chat screenshot to get started.</p>
              <p className="mt-1 text-[12px] text-white/50">
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
