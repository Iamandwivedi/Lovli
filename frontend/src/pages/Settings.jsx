import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ChipGroup from '@/components/ChipGroup';
import { useAuth } from '@/lib/auth';
import { api, extractErrorMessage } from '@/lib/api';
import {
  PLATFORM_LABELS,
  platformLabelFromValue,
  platformValueFromLabel,
} from '@/lib/platform';
import { toast } from 'sonner';
import {
  LogOut,
  ShieldOff,
  LockKeyhole,
  Sparkles,
  UserRound,
  SlidersHorizontal,
  ShieldCheck,
  BadgeCheck,
  Mail,
  ChevronRight,
} from 'lucide-react';

const LANGUAGES = ['English', 'Hinglish', 'Hindi + English mixed'];

const INPUT_CLS =
  'bg-lovli-card border-lovli-border text-lovli-text placeholder:text-lovli-text-faint h-11 rounded-xl';

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-lovli-border bg-lovli-card">
        <Icon className="h-3.5 w-3.5 text-lovli-lavender" />
      </span>
      <h2 className="text-[13px] font-semibold text-lovli-text">{title}</h2>
    </div>
  );
}

function Row({ label, value, testId }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-lovli-text-muted">{label}</span>
      <span className="text-lovli-text" data-testid={testId}>
        {value}
      </span>
    </div>
  );
}

function loginMethodLabel(provider) {
  const v = String(provider || '').toLowerCase();
  if (v === 'google') return 'Google';
  if (v === 'email' || v === 'password') return 'Email & password';
  return 'Email & password';
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [platformLabel, setPlatformLabel] = useState(
    platformLabelFromValue(user?.preferred_platform)
  );
  const [language, setLanguage] = useState(user?.language_preference || 'Hinglish');
  // Timezone is auto-detected by the client on every generation; we keep the
  // saved value silently in state and pass it through on save — no UI control.
  const [tz] = useState(user?.timezone || 'Asia/Kolkata');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    try {
      setSaving(true);
      const { data } = await api.patch('/settings', {
        name,
        preferred_platform: platformValueFromLabel(platformLabel),
        language_preference: language,
        timezone: tz,
      });
      updateUser(data);
      toast.success('Settings saved.');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Could not save.'));
    } finally {
      setSaving(false);
    }
  };

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const plan = user?.plan === 'pro' ? 'Pro' : 'Free';
  const used = user?.daily_generation_count ?? 0;
  const limit = 8;

  return (
    <AppShell>
      <div data-testid="settings-page" className="space-y-6">
        <h1 className="font-display text-[22px] font-semibold text-lovli-text">
          Settings
        </h1>

        {/* Section 1 — Account */}
        <section
          className="lovli-glass rounded-2xl p-5 space-y-4"
          data-testid="settings-account-section"
        >
          <SectionHeader icon={UserRound} title="Account" />

          <div className="space-y-1.5">
            <Label className="text-lovli-text-soft text-[12.5px]" htmlFor="name">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="settings-name-input"
              className={INPUT_CLS}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-lovli-text-soft text-[12.5px]">Email</Label>
            <Input
              value={user?.email || ''}
              disabled
              className="bg-lovli-card border-lovli-border text-lovli-text-muted h-11 rounded-xl cursor-not-allowed"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-lovli-border bg-lovli-card px-3.5 py-2.5">
            <span className="inline-flex items-center gap-2 text-[12.5px] text-lovli-text-muted">
              <Mail className="h-3.5 w-3.5 text-lovli-lavender/80" /> Login method
            </span>
            <span
              className="text-[12.5px] text-lovli-text"
              data-testid="settings-login-method"
            >
              {loginMethodLabel(user?.auth_provider)}
            </span>
          </div>

          <Button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full lovli-cta min-h-[46px] rounded-full"
            data-testid="settings-save-button"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onLogout}
            data-testid="settings-logout-button"
            className="w-full justify-start text-lovli-text hover:bg-lovli-card hover:text-lovli-text min-h-[44px] rounded-xl border border-lovli-border"
          >
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </section>

        {/* Section 2 — Preferences */}
        <section
          className="lovli-glass rounded-2xl p-5 space-y-5"
          data-testid="settings-preferences-section"
        >
          <SectionHeader icon={SlidersHorizontal} title="Preferences" />

          <div className="space-y-2">
            <Label className="text-lovli-text-soft text-[12.5px]">Default language</Label>
            <ChipGroup
              options={LANGUAGES}
              value={language}
              onChange={setLanguage}
              testId="settings-language-toggle"
              ariaLabel="Default language"
            />
            <p className="text-[11.5px] leading-relaxed text-lovli-text-muted">
              Used as your default. You can still choose a different language before every
              generation.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-lovli-text-soft text-[12.5px]">Default platform</Label>
            <ChipGroup
              options={PLATFORM_LABELS}
              value={platformLabel}
              onChange={setPlatformLabel}
              testId="settings-platform-toggle"
              ariaLabel="Default platform"
            />
            <p className="text-[11.5px] leading-relaxed text-lovli-text-muted">
              Used as your default. You can change platform on each reply.
            </p>
          </div>
        </section>

        {/* Section 3 — Plan */}
        <section
          className="lovli-glass rounded-2xl p-5 space-y-4"
          data-testid="settings-plan-section"
        >
          <SectionHeader icon={BadgeCheck} title="Plan" />
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-lovli-text-muted">Current plan</span>
              <span
                className="rounded-full border border-lovli-border bg-lovli-card px-2.5 py-1 text-[11px] text-lovli-text-soft"
                data-testid="settings-plan-badge"
              >
                {plan}
              </span>
            </div>
            <Row
              label="Daily usage"
              value={`${used} of ${limit} used today`}
              testId="settings-usage-text"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/pro')}
            data-testid="settings-pro-link"
            className="group w-full justify-between min-h-[44px] rounded-xl border border-lovli-lavender/35 bg-lovli-lavender/8 text-lovli-text hover:bg-lovli-lavender/12 hover:border-lovli-lavender/55"
          >
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-lovli-lavender" />
              Get early access to Pro
            </span>
            <ChevronRight className="h-4 w-4 text-lovli-lavender/85 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </section>

        {/* Section 4 — Privacy */}
        <section
          className="lovli-glass rounded-2xl p-5 space-y-3"
          data-testid="settings-privacy-section"
        >
          <SectionHeader icon={ShieldCheck} title="Privacy" />
          <p
            className="inline-flex items-center gap-1.5 text-[12.5px] text-lovli-text-muted"
            data-testid="settings-privacy-cue"
          >
            <LockKeyhole className="h-3 w-3 text-lovli-lavender/80" />
            Private by design. You control what gets saved.
          </p>
          <p className="text-[12px] leading-relaxed text-lovli-text-muted">
            Screenshots are used only to generate your replies and aren’t stored. Memory
            cards stay private to your account.
          </p>
          <Button
            type="button"
            variant="ghost"
            disabled
            className="w-full justify-start text-lovli-text-muted min-h-[44px] rounded-xl border border-lovli-border bg-lovli-card cursor-not-allowed"
            data-testid="settings-delete-account-button"
            aria-disabled="true"
            title="Coming soon"
          >
            <ShieldOff className="mr-2 h-4 w-4" /> Delete account (coming soon)
          </Button>
        </section>
      </div>
    </AppShell>
  );
}
