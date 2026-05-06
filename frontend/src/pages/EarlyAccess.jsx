import React from 'react';
import { Link } from 'react-router-dom';
import EarlyAccessForm from '@/components/EarlyAccessForm';
import LovliMark from '@/components/LovliMark';

export default function EarlyAccess() {
  return (
    <div className="min-h-screen lovli-noise flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md" data-testid="early-access-page">
        <div className="mb-6 flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <LovliMark size={36} />
            <span className="font-display text-xl font-semibold tracking-tight text-white">
              Lovli
            </span>
          </Link>
        </div>
        <div className="lovli-glass rounded-2xl p-5">
          <h1 className="font-display text-2xl font-semibold text-white">Get early access</h1>
          <p className="mt-1 text-sm text-white/65">
            Drop your email and we’ll let you in as we open new features.
          </p>
          <div className="mt-4">
            <EarlyAccessForm
              type="general"
              source="early-access-page"
              successMessage="You’re on the list."
              testIdPrefix="early-access"
            />
          </div>
        </div>
        <p className="mt-4 text-center text-[11px] text-white/45">
          By submitting you agree to our{' '}
          <Link to="/terms" className="underline">
            Terms
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="underline">
            Privacy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
