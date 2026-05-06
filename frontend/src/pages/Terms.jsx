import React from 'react';
import { Link } from 'react-router-dom';
import LovliMark from '@/components/LovliMark';

export default function Terms() {
  return (
    <div className="min-h-screen lovli-noise px-4 py-10">
      <div className="mx-auto w-full max-w-2xl" data-testid="terms-page">
        <Link to="/" className="mb-6 inline-flex items-center gap-2">
          <LovliMark size={32} />
          <span className="font-display text-lg font-semibold tracking-tight text-white">
            Lovli
          </span>
        </Link>
        <div className="lovli-glass rounded-2xl p-6">
          <h1 className="font-display text-2xl font-semibold text-white">Terms</h1>
          <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-white/80">
            <p>
              By using Lovli you agree to use the product respectfully. Lovli is a writing
              assistant designed to help you communicate better. It is not designed for
              manipulation, harassment, or impersonation.
            </p>
            <h2 className="font-display text-base font-semibold text-white">Acceptable use</h2>
            <p>
              Don’t use Lovli to deceive, harass, or threaten anyone. Don’t generate content
              that targets minors or violates anyone’s safety. Be a decent human.
            </p>
            <h2 className="font-display text-base font-semibold text-white">AI suggestions</h2>
            <p>
              Lovli’s replies are AI-generated suggestions — always your call to send. Edit
              anything that doesn’t feel right.
            </p>
            <h2 className="font-display text-base font-semibold text-white">Limits</h2>
            <p>
              The free plan includes 8 generations per day. Pro plans (early access) unlock
              unlimited generations and additional features.
            </p>
            <h2 className="font-display text-base font-semibold text-white">Changes</h2>
            <p>
              We may update these terms as Lovli evolves. We’ll let you know when material
              changes happen.
            </p>
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
