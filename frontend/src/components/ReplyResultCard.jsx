import React, { useState } from 'react';
import { Copy, RefreshCw, Bookmark, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const FEEDBACK_OPTIONS = [
  'Better',
  'Too dry',
  'Too much',
  'More Hinglish',
  'More confident',
];

export default function ReplyResultCard({
  reply,
  index,
  vibe,
  generationId,
  onRegenerate,
  onSaveToMemory,
}) {
  const [copied, setCopied] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

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
      try {
        await api.post('/feedback', { generation_id: generationId, copied_reply_index: index });
      } catch {
        /* non-critical */
      }
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Could not copy. Long-press to copy.');
    }
  };

  const sendFeedback = async (label) => {
    try {
      await api.post('/feedback', { generation_id: generationId, feedback: label });
      setFeedbackSent(true);
      toast.success('Got it. We’ll learn from this.');
    } catch {
      toast.error('Couldn’t save feedback.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.06, ease: [0.2, 0.8, 0.2, 1] }}
      className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-4 shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
      data-testid="reply-result-card"
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/75">
          {vibe} · Option {index + 1}
        </span>
        {onSaveToMemory && (
          <button
            type="button"
            onClick={() => onSaveToMemory(reply)}
            aria-label="Save to memory"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/[0.08] hover:text-white"
            data-testid="reply-save-button"
          >
            <Bookmark className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-white/92" data-testid="reply-result-text">
        {reply}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={onCopy}
          size="sm"
          className="min-h-[36px] rounded-full bg-white text-[#0B0D1A] hover:bg-white/90"
          data-testid="reply-copy-button"
        >
          <Copy className="mr-1.5 h-3.5 w-3.5" />
          {copied ? 'Copied' : 'Copy'}
        </Button>

        {onRegenerate && (
          <Button
            type="button"
            onClick={onRegenerate}
            size="sm"
            variant="ghost"
            className="min-h-[36px] rounded-full border border-white/10 bg-white/[0.04] text-white/85 hover:bg-white/[0.08]"
            data-testid="reply-regenerate-button"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Regenerate
          </Button>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="min-h-[36px] rounded-full border border-white/10 bg-white/[0.04] text-white/85 hover:bg-white/[0.08]"
              data-testid="reply-feedback-button"
              disabled={feedbackSent}
            >
              <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
              {feedbackSent ? 'Thanks' : 'Feedback'}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-56 rounded-2xl border-white/12 bg-[#0B0D1A]/90 backdrop-blur-2xl text-white"
            data-testid="reply-feedback-popover"
          >
            <div className="flex flex-col gap-1.5">
              {FEEDBACK_OPTIONS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => sendFeedback(f)}
                  className="text-left text-sm rounded-lg px-2.5 py-1.5 hover:bg-white/[0.08]"
                  data-testid={`reply-feedback-option-${f.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </motion.div>
  );
}
