import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function EarlyAccessForm({
  type = 'general',
  source = 'inline',
  question,
  successMessage,
  defaultEmail = '',
  testIdPrefix = 'early-access',
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!email) {
      toast.error('Add your email so we can let you in.');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/waitlist', {
        email,
        type,
        source,
        payload: question ? { question, answer } : {},
      });
      setDone(true);
      toast.success(successMessage || 'You’re on the list.');
    } catch {
      toast.error('Could not save right now. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div
        className="rounded-2xl border border-emerald-300/20 bg-emerald-400/[0.08] p-4 text-emerald-100 text-sm"
        data-testid={`${testIdPrefix}-success`}
      >
        {successMessage || 'You’re on the list.'}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3" data-testid={`${testIdPrefix}-form`}>
      <Input
        type="email"
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        data-testid={`${testIdPrefix}-email-input`}
        className="bg-white/[0.06] border-white/12 text-white placeholder:text-white/40"
      />
      {question && (
        <Textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={question}
          rows={3}
          data-testid={`${testIdPrefix}-help-textarea`}
          className="bg-white/[0.06] border-white/12 text-white placeholder:text-white/40"
        />
      )}
      <Button
        type="submit"
        disabled={submitting}
        className="w-full lovli-cta text-white min-h-[44px]"
        data-testid={`${testIdPrefix}-submit-button`}
      >
        {submitting ? 'Sending…' : 'Get Early Access'}
      </Button>
    </form>
  );
}
