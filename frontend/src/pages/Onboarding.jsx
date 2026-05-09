import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ChipGroup from '@/components/ChipGroup';
import { useAuth } from '@/lib/auth';
import { api, getLocalTimezone } from '@/lib/api';
import {
  PLATFORM_LABELS,
  platformLabelFromValue,
  platformValueFromLabel,
} from '@/lib/platform';
import { toast } from 'sonner';

const LANGUAGES = ['English', 'Hinglish', 'Hindi + English mixed'];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [platformLabel, setPlatformLabel] = useState(
    platformLabelFromValue(user?.preferred_platform)
  );
  const [language, setLanguage] = useState(user?.language_preference || 'Hinglish');
  const [submitting, setSubmitting] = useState(false);

  const finish = async (skip = false) => {
    try {
      setSubmitting(true);
      const payload = skip
        ? { timezone: getLocalTimezone() }
        : {
            preferred_platform: platformValueFromLabel(platformLabel),
            language_preference: language,
            timezone: getLocalTimezone(),
          };
      const { data } = await api.patch('/auth/onboarding', payload);
      updateUser(data);
      navigate('/app', { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not save preferences.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen lovli-noise flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md" data-testid="onboarding-page">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold text-white">A few quick basics</h1>
          <button
            type="button"
            onClick={() => finish(true)}
            className="text-sm text-white/60 hover:text-white"
            data-testid="onboarding-skip-button"
          >
            Skip
          </button>
        </div>
        <p className="mt-1 text-sm text-white/65">
          Helps Lovli understand where you chat and how you talk. You can change this later.
        </p>

        <div className="mt-5 space-y-5">
          <section className="lovli-glass rounded-2xl p-4">
            <h2 className="text-sm font-medium text-white/85">Where do you mostly chat?</h2>
            <div className="mt-3">
              <ChipGroup
                options={PLATFORM_LABELS}
                value={platformLabel}
                onChange={setPlatformLabel}
                testId="onboarding-platform-toggle"
                ariaLabel="Preferred platform"
              />
            </div>
          </section>

          <section className="lovli-glass rounded-2xl p-4">
            <h2 className="text-sm font-medium text-white/85">Language</h2>
            <div className="mt-3">
              <ChipGroup
                options={LANGUAGES}
                value={language}
                onChange={setLanguage}
                testId="onboarding-language-toggle"
                ariaLabel="Language preference"
              />
            </div>
          </section>

          <Button
            type="button"
            onClick={() => finish(false)}
            disabled={submitting}
            className="w-full lovli-cta min-h-[48px]"
            data-testid="onboarding-continue-button"
          >
            {submitting ? 'Saving…' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
