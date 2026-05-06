import React from 'react';
import { Link } from 'react-router-dom';
import LovliMark from '@/components/LovliMark';

export default function Privacy() {
  return (
    <div className="min-h-screen lovli-noise px-4 py-10">
      <div className="mx-auto w-full max-w-2xl" data-testid="privacy-page">
        <Link to="/" className="mb-6 inline-flex items-center gap-2">
          <LovliMark size={32} />
          <span className="font-display text-lg font-semibold tracking-tight text-white">
            Lovli
          </span>
        </Link>
        <div className="lovli-glass rounded-2xl p-6">
          <h1 className="font-display text-2xl font-semibold text-white">Privacy</h1>
          <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-white/80">
            <p>
              Lovli is built to help you communicate better, not pretend to be someone else. We
              take privacy seriously and design with your comfort in mind.
            </p>
            <h2 className="font-display text-base font-semibold text-white">Screenshots</h2>
            <p>
              Screenshots you upload are sent to our AI provider only to generate your reply
              suggestions. We do not store screenshot images on our servers by default. The
              conversation context extracted from a screenshot is processed in-memory for the
              request.
            </p>
            <h2 className="font-display text-base font-semibold text-white">Memory cards</h2>
            <p>
              Memory is private by design. Only you can see and edit your memory cards. You
              control what gets saved, and you can delete any card at any time.
            </p>
            <h2 className="font-display text-base font-semibold text-white">Account data</h2>
            <p>
              We store your name, email, plan status, daily usage count, and your stated
              preferences (platform, reply style, language, timezone). We never sell your data.
            </p>
            <h2 className="font-display text-base font-semibold text-white">Contact</h2>
            <p>Questions or requests? Reach out at hello@lovli.app.</p>
          </div>
          <div className="mt-5 text-sm">
            <Link to="/" className="text-white/70 hover:text-white underline">
              Back to Lovli
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
