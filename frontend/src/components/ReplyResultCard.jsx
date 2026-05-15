import React, { useState } from 'react';
import { Copy, RefreshCw, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { api } from '@/lib/api';

/**
 * Map the user's chosen vibe to a human-feeling tone label shown on each
 * reply card. Keeps the language warm and conversational — avoids "Option 1/2/3".
 */
const TONE_LABEL = {
  Playful: 'Playful',
  Flirty: 'Smooth',
  Sincere: 'Sincere',
  Respectful: 'Respectful',
  Confident: 'Confident',
};

function toneFromVibe(vibe) {
  return TONE_LABEL[vibe] || 'Warm';
}

export default function ReplyResultCard({
  reply,
  index,
  vibe,
  generationId,
  onRegenerate,
}) {
  const [copied, setCopied] = useState(false);
  const tone = toneFromVibe(vibe);

  const onCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(reply);
      } else {
        const el = document.createElement('textarea');
        el.value = reply;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      toast.success('Copied. Go send it.');
      // Silent telemetry — unchanged backend behavior
      try {
        await api.post('/feedback', { generation_id: generationId, copied_reply_index: index });
      } catch {
        /* non-critical */
      }
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Could not copy. Long-press to copy.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.32,
        delay: index * 0.08,
        ease: [0.2, 0.8, 0.2, 1],
      }}
      className="rounded-2xl border border-lovli-border bg-lovli-card-2/85 backdrop-blur-xl p-5 shadow-[0_14px_44px_rgba(0,0,0,0.45)]"
      data-testid="reply-result-card"
    >
      {/* Tone label — small, warm, never "Option N" */}
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full bg-lovli-lavender shadow-[0_0_8px_rgba(167,139,250,0.55)]"
        />
        <span
          className="text-[11px] font-medium uppercase tracking-[0.08em] text-lovli-lavender/90"
          data-testid="reply-tone-label"
        >
          {tone}
        </span>
      </div>

      {/* Reply text — the hero. Large, airy, high contrast. */}
      <p
        className="mt-3 whitespace-pre-wrap break-words text-[17px] leading-[1.6] font-normal text-lovli-text selection:bg-lovli-lavender/30"
        data-testid="reply-result-text"
      >
        {reply}
      </p>

      {/* Actions — only Copy + Regenerate. Copy is primary, Regenerate is quieter. */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={onCopy}
          size="sm"
          className="min-h-[40px] rounded-full lovli-cta px-5 text-[13px] font-semibold"
          data-testid="reply-copy-button"
        >
          {copied ? (
            <>
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copy
            </>
          )}
        </Button>

        {onRegenerate && (
          <Button
            type="button"
            onClick={onRegenerate}
            size="sm"
            variant="ghost"
            className="min-h-[40px] rounded-full border border-lovli-border bg-transparent px-4 text-[13px] font-medium text-lovli-text-muted hover:bg-lovli-card hover:text-lovli-text hover:border-lovli-border-strong"
            data-testid="reply-regenerate-button"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Regenerate
          </Button>
        )}
      </div>
    </motion.div>
  );
}
