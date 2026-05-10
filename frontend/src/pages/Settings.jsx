import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ChipGroup from '@/components/ChipGroup';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import {
  PLATFORM_LABELS,
  platformLabelFromValue,
  platformValueFromLabel,
} from '@/lib/platform';
import { toast } from 'sonner';
import { LogOut, ShieldOff } from 'lucide-react';

const LANGUAGES = ['English', 'Hinglish', 'Hindi + English mixed'];
const INPUT_CLS =
  'bg-lovli-card border-lovli-border text-lovli-text placeholder:text-lovli-text-faint';

export default function Settings() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [platformLabel, setPlatformLabel] = useState(
    platformLabelFromValue(user?.preferred_platform)
  );
  const [language, setLanguage] = useState(user?.language_preference || 'Hinglish');
  const [tz, setTz] = useState(user?.timezone || 'Asia/Kolkata');
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
      toast.error(err?.response?.data?.detail || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <AppShell>
      <div data-testid="settings-page" className="space-y-6">
        <h1 className="font-display text-[22px] font-semibold text-lovli-text">Settings</h1>

        <section className="lovli-glass rounded-2xl p-5 space-y-4">
          <h2 className="text-[13px] font-medium text-lovli-text-soft">Profile</h2>
          <div className="space-y-1.5">
            <Label className="text-lovli-text-soft" htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="settings-name-input"
              className={INPUT_CLS}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-lovli-text-soft">Email</Label>
            <Input
              value={user?.email || ''}
              disabled
              className="bg-lovli-card border-lovli-border text-lovli-text-muted"
            />
          </div>
          <div className="flex items-center justify-between text-sm pt-1">
            <span className="text-lovli-text-muted">Plan</span>
            <span
              className="rounded-full border border-lovli-border bg-lovli-card px-2.5 py-1 text-[11px] text-lovli-text-soft"
              data-testid="settings-plan-badge"
            >
              {user?.plan === 'pro' ? 'Pro' : 'Free'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-lovli-text-muted">Daily usage</span>
            <span className="text-lovli-text-soft" data-testid="settings-usage-text">
              {user?.daily_generation_count ?? 0} of 8 used today
            </span>
          </div>
        </section>

        <section className="lovli-glass rounded-2xl p-5 space-y-4">
          <h2 className="text-[13px] font-medium text-lovli-text-soft">Preferences</h2>
          <div className="space-y-2">
            <Label className="text-lovli-text-soft">Preferred platform</Label>
            <ChipGroup
              options={PLATFORM_LABELS}
              value={platformLabel}
              onChange={setPlatformLabel}
              testId="settings-platform-toggle"
              ariaLabel="Preferred platform"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-lovli-text-soft">Language</Label>
            <ChipGroup
              options={LANGUAGES}
              value={language}
              onChange={setLanguage}
              testId="settings-language-toggle"
              ariaLabel="Language"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-lovli-text-soft" htmlFor="tz">Timezone</Label>
            <Input
              id="tz"
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              data-testid="settings-timezone-input"
              className={INPUT_CLS}
            />
            <p className="text-[11px] text-lovli-text-muted">Used for daily-limit reset.</p>
          </div>
          <div className="pt-1">
            <Button
              type="button"
              onClick={save}
              disabled={saving}
              className="w-full lovli-cta min-h-[46px] rounded-full"
              data-testid="settings-save-button"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </section>

        <section className="lovli-glass rounded-2xl p-5 space-y-2">
          <h2 className="text-[13px] font-medium text-lovli-text-soft">Account</h2>
          <Button
            type="button"
            variant="ghost"
            onClick={onLogout}
            data-testid="settings-logout-button"
            className="w-full justify-start text-lovli-text hover:bg-lovli-card hover:text-lovli-text min-h-[44px] rounded-xl"
          >
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled
            className="w-full justify-start text-lovli-text-muted min-h-[44px] rounded-xl"
            data-testid="settings-delete-account-button"
          >
            <ShieldOff className="mr-2 h-4 w-4" /> Delete account (coming soon)
          </Button>
        </section>
      </div>
    </AppShell>
  );
}
