import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ChipGroup from '@/components/ChipGroup';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { LogOut, ShieldOff } from 'lucide-react';

const PLATFORMS = ['Instagram', 'Hinge', 'Bumble', 'Tinder', 'WhatsApp', 'Other'];
const STYLES = ['Playful', 'Flirty', 'Sincere', 'Respectful', 'Confident'];
const LANGUAGES = ['English', 'Hinglish', 'Hindi + English mixed'];

export default function Settings() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [platform, setPlatform] = useState(user?.preferred_platform || 'Instagram');
  const [style, setStyle] = useState(user?.preferred_style || 'Playful');
  const [language, setLanguage] = useState(user?.language_preference || 'Hinglish');
  const [tz, setTz] = useState(user?.timezone || 'Asia/Kolkata');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    try {
      setSaving(true);
      const { data } = await api.patch('/settings', {
        name,
        preferred_platform: platform,
        preferred_style: style,
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
      <div data-testid="settings-page" className="space-y-5">
        <h1 className="font-display text-2xl font-semibold text-white">Settings</h1>

        <section className="lovli-glass rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-medium text-white/85">Profile</h2>
          <div className="space-y-1.5">
            <Label className="text-white/80" htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="settings-name-input"
              className="bg-white/[0.05] border-white/10 text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/80">Email</Label>
            <Input
              value={user?.email || ''}
              disabled
              className="bg-white/[0.04] border-white/10 text-white/60"
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Plan</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/85" data-testid="settings-plan-badge">
              {user?.plan === 'pro' ? 'Pro' : 'Free'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Daily usage</span>
            <span className="text-white/85" data-testid="settings-usage-text">
              {user?.daily_generation_count ?? 0} of 8 used today
            </span>
          </div>
        </section>

        <section className="lovli-glass rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-medium text-white/85">Preferences</h2>
          <div className="space-y-1.5">
            <Label className="text-white/80">Preferred platform</Label>
            <ChipGroup options={PLATFORMS} value={platform} onChange={setPlatform} testId="settings-platform-toggle" ariaLabel="Preferred platform" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/80">Reply style</Label>
            <ChipGroup options={STYLES} value={style} onChange={setStyle} testId="settings-style-toggle" ariaLabel="Reply style" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/80">Language</Label>
            <ChipGroup options={LANGUAGES} value={language} onChange={setLanguage} testId="settings-language-toggle" ariaLabel="Language" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/80" htmlFor="tz">Timezone</Label>
            <Input
              id="tz"
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              data-testid="settings-timezone-input"
              className="bg-white/[0.05] border-white/10 text-white"
            />
            <p className="text-[11px] text-white/45">Used for daily-limit reset.</p>
          </div>
          <div className="pt-1">
            <Button
              type="button"
              onClick={save}
              disabled={saving}
              className="w-full lovli-cta text-white min-h-[44px]"
              data-testid="settings-save-button"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </section>

        <section className="lovli-glass rounded-2xl p-4 space-y-2">
          <h2 className="text-sm font-medium text-white/85">Account</h2>
          <Button
            type="button"
            variant="ghost"
            onClick={onLogout}
            data-testid="settings-logout-button"
            className="w-full justify-start text-white/85 hover:bg-white/[0.06] min-h-[44px]"
          >
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled
            className="w-full justify-start text-white/55 min-h-[44px]"
            data-testid="settings-delete-account-button"
          >
            <ShieldOff className="mr-2 h-4 w-4" /> Delete account (coming soon)
          </Button>
        </section>
      </div>
    </AppShell>
  );
}
