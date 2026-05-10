import React, { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import EarlyAccessForm from '@/components/EarlyAccessForm';
import GlassCard from '@/components/GlassCard';
import ChipGroup from '@/components/ChipGroup';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { BrainCircuit, Plus, Pencil, Trash2, Lock } from 'lucide-react';

const GOAL_OPTIONS = ['Friendship', 'Talking', 'Dating', 'Serious', 'Impress first'];
const SITUATION_OPTIONS = [
  'Not connected yet',
  'Texting',
  'Talking',
  'Dating',
  'Complicated',
];

const BLANK = {
  nickname: '',
  goal: '',
  current_situation: '',
  relationship_stage: '',
  where_met: '',
  likes: '',
  dislikes: '',
  communication_style: '',
  inside_jokes: '',
  important_dates: '',
  best_approach: '',
  notes: '',
  boundaries: '',
};

const INPUT_CLS =
  'bg-lovli-card border-lovli-border text-lovli-text placeholder:text-lovli-text-faint';

function MemoryFormDialog({ open, onOpenChange, initial, onSaved }) {
  const [form, setForm] = useState(initial || BLANK);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setForm({ ...BLANK, ...(initial || {}) });
  }, [initial, open]);

  const isEdit = Boolean(initial?.id);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.nickname.trim()) {
      toast.error('Add a nickname so you can find this card later.');
      return;
    }
    try {
      setSubmitting(true);
      let saved;
      if (isEdit) {
        const { data } = await api.patch(`/memory-cards/${initial.id}`, form);
        saved = data;
      } else {
        const { data } = await api.post('/memory-cards', form);
        saved = data;
      }
      onSaved?.(saved, isEdit ? 'updated' : 'created');
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not save right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md max-h-[88vh] overflow-y-auto rounded-2xl border-lovli-border bg-lovli-card-2/95 backdrop-blur-2xl"
        data-testid="memory-form"
      >
        <DialogHeader>
          <DialogTitle className="text-lovli-text">
            {isEdit ? 'Edit memory' : 'Save a memory'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-lovli-text-soft" htmlFor="nickname">
              Nickname
            </Label>
            <Input
              id="nickname"
              value={form.nickname}
              onChange={(e) => set('nickname', e.target.value)}
              placeholder="e.g. Coffee Girl"
              data-testid="memory-form-nickname-input"
              className={INPUT_CLS}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-lovli-text-soft">What do you want with this person?</Label>
            <ChipGroup
              options={GOAL_OPTIONS}
              value={form.goal}
              onChange={(v) => set('goal', v)}
              testId="memory-form-goal-toggle"
              ariaLabel="Goal"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-lovli-text-soft">Current situation</Label>
            <ChipGroup
              options={SITUATION_OPTIONS}
              value={form.current_situation}
              onChange={(v) => set('current_situation', v)}
              testId="memory-form-situation-toggle"
              ariaLabel="Current situation"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-lovli-text-soft">Relationship stage</Label>
              <Input
                value={form.relationship_stage}
                onChange={(e) => set('relationship_stage', e.target.value)}
                placeholder="Optional"
                className={INPUT_CLS}
                data-testid="memory-form-stage-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-lovli-text-soft">Where you met</Label>
              <Input
                value={form.where_met}
                onChange={(e) => set('where_met', e.target.value)}
                placeholder="Hinge, friend's party…"
                className={INPUT_CLS}
                data-testid="memory-form-where-input"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-lovli-text-soft">Likes</Label>
            <Input
              value={form.likes}
              onChange={(e) => set('likes', e.target.value)}
              placeholder="chai, indie music, quiet cafes…"
              className={INPUT_CLS}
              data-testid="memory-form-likes-input"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-lovli-text-soft">Avoid</Label>
            <Input
              value={form.dislikes}
              onChange={(e) => set('dislikes', e.target.value)}
              placeholder="too much flirting, pressure to meet…"
              className={INPUT_CLS}
              data-testid="memory-form-avoid-input"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-lovli-text-soft">Communication style</Label>
            <Input
              value={form.communication_style}
              onChange={(e) => set('communication_style', e.target.value)}
              placeholder="funny, calm, career-focused…"
              className={INPUT_CLS}
              data-testid="memory-form-style-input"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-lovli-text-soft">Inside jokes</Label>
            <Input
              value={form.inside_jokes}
              onChange={(e) => set('inside_jokes', e.target.value)}
              placeholder="optional"
              className={INPUT_CLS}
              data-testid="memory-form-jokes-input"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-lovli-text-soft">Important dates / context</Label>
            <Input
              value={form.important_dates}
              onChange={(e) => set('important_dates', e.target.value)}
              placeholder="interview Friday, birthday next month…"
              className={INPUT_CLS}
              data-testid="memory-form-important-input"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-lovli-text-soft">Best approach (optional)</Label>
            <Textarea
              value={form.best_approach}
              onChange={(e) => set('best_approach', e.target.value)}
              rows={2}
              placeholder="e.g. Light, respectful, playful — let her lead the pace."
              className={INPUT_CLS}
              data-testid="memory-form-approach-textarea"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-lovli-text-soft">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              placeholder="Anything else worth remembering…"
              className={INPUT_CLS}
              data-testid="memory-form-notes-textarea"
            />
          </div>

          <p className="text-[11px] text-lovli-text-muted">
            Memory is private by design. You control what gets saved — and you can edit any
            field anytime.
          </p>
        </div>

        <DialogFooter className="mt-2 gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-lovli-text-soft hover:bg-lovli-card hover:text-lovli-text rounded-full"
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={submitting}
            className="lovli-cta rounded-full"
            data-testid="memory-save-button"
          >
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Save memory'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MemoryCardRow({ label, value, full = false }) {
  if (!value) return null;
  return (
    <p className={full ? 'sm:col-span-2 break-words' : 'break-words'}>
      <span className="text-lovli-text-muted">{label} — </span>
      <span className="text-lovli-text">{value}</span>
    </p>
  );
}

function MemoryListItem({ card, onEdit, onDelete }) {
  return (
    <GlassCard className="p-4" data-testid="memory-card-item">
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className="font-display text-base font-semibold text-lovli-text break-words"
                data-testid="memory-card-nickname"
              >
                {card.nickname}
              </h3>
              {card.current_situation && (
                <span className="rounded-full border border-lovli-lavender/45 bg-lovli-lavender/10 px-2 py-0.5 text-[11px] text-lovli-text">
                  {card.current_situation}
                </span>
              )}
              {card.goal && (
                <span className="rounded-full border border-lovli-border bg-lovli-card px-2 py-0.5 text-[11px] text-lovli-text-soft">
                  {card.goal}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => onEdit(card)}
              className="h-8 w-8 rounded-full border border-lovli-border bg-lovli-card text-lovli-text-soft hover:bg-lovli-card-2 hover:text-lovli-text"
              data-testid="memory-edit-button"
              aria-label="Edit memory"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => onDelete(card)}
              className="h-8 w-8 rounded-full border border-rose-300/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15"
              data-testid="memory-delete-button"
              aria-label="Delete memory"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 text-[13px] leading-relaxed sm:grid-cols-2">
          <MemoryCardRow label="Likes" value={card.likes} />
          <MemoryCardRow label="Avoid" value={card.dislikes} />
          <MemoryCardRow label="Important" value={card.important_dates} full />
          <MemoryCardRow label="Best approach" value={card.best_approach} full />
          <MemoryCardRow label="Notes" value={card.notes} full />
        </div>
      </div>
    </GlassCard>
  );
}

function PreviewExample() {
  return (
    <GlassCard className="p-4" data-testid="memory-preview-card">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-lovli-lavender/15 border border-lovli-lavender/35">
          <BrainCircuit className="h-3.5 w-3.5 text-lovli-lavender" />
        </span>
        <h3 className="font-display text-base font-semibold text-lovli-text">Coffee Girl</h3>
        <span className="rounded-full border border-lovli-lavender/45 bg-lovli-lavender/10 px-2 py-0.5 text-[11px] text-lovli-text">
          Talking
        </span>
        <span className="rounded-full border border-lovli-border bg-lovli-card px-2 py-0.5 text-[11px] text-lovli-text-soft">
          Dating
        </span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 text-[13px] leading-relaxed sm:grid-cols-2">
        <p>
          <span className="text-lovli-text-muted">Likes — </span>
          <span className="text-lovli-text">Chai, indie music, quiet cafes</span>
        </p>
        <p>
          <span className="text-lovli-text-muted">Avoid — </span>
          <span className="text-lovli-text">Too much flirting, pressure to meet</span>
        </p>
        <p className="sm:col-span-2">
          <span className="text-lovli-text-muted">Important — </span>
          <span className="text-lovli-text">Interview on Friday</span>
        </p>
        <p className="sm:col-span-2">
          <span className="text-lovli-text-muted">Best approach — </span>
          <span className="text-lovli-text">Light, respectful, playful</span>
        </p>
        <p className="sm:col-span-2">
          <span className="text-lovli-text-muted">Notes — </span>
          <span className="text-lovli-text">Inside joke: world domination. Ask about her interview, keep it easy.</span>
        </p>
      </div>
    </GlassCard>
  );
}

export default function Memory() {
  const { user } = useAuth();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const refresh = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/memory-cards');
      setCards(data || []);
    } catch {
      toast.error('Could not load your memory cards.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onSaved = async (saved, action) => {
    toast.success(action === 'updated' ? 'Memory updated.' : 'Memory saved.');
    await refresh();
  };

  const onDelete = async (card) => {
    const ok = window.confirm(`Delete "${card.nickname}"? You can't undo this.`);
    if (!ok) return;
    try {
      await api.delete(`/memory-cards/${card.id}`);
      toast.success('Memory deleted.');
      setCards((cs) => cs.filter((c) => c.id !== card.id));
    } catch {
      toast.error('Could not delete right now.');
    }
  };

  return (
    <AppShell>
      <div data-testid="memory-page" className="space-y-6">
        <section className="relative overflow-hidden rounded-2xl border border-lovli-border bg-lovli-card-2/70 p-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(60% 50% at 90% 10%, rgba(167,139,250,0.14), transparent 60%), radial-gradient(50% 50% at 10% 100%, rgba(56,189,248,0.08), transparent 60%)',
            }}
          />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-lovli-border bg-lovli-card px-2.5 py-1 text-[11px] text-lovli-text-soft">
              <BrainCircuit className="h-3 w-3 text-lovli-lavender" /> Private journal — you control what's saved
            </span>
            <h1 className="mt-3 font-display text-[22px] font-semibold text-lovli-text">
              Lovli Memory
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-lovli-text-soft">
              Build a private profile of the person you like. Save what they like, dislike,
              their vibe, your history, and important details — so Lovli can suggest better
              replies and smarter moves.
            </p>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-lovli-text">
              Your memories
            </h2>
            <Dialog
              open={open}
              onOpenChange={(v) => {
                setOpen(v);
                if (!v) setEditing(null);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setEditing(null);
                    setOpen(true);
                  }}
                  className="lovli-cta rounded-full min-h-[36px] px-4"
                  data-testid="memory-create-button"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Create memory
                </Button>
              </DialogTrigger>
              <MemoryFormDialog
                open={open}
                onOpenChange={setOpen}
                initial={editing}
                onSaved={onSaved}
              />
            </Dialog>
          </div>

          {loading ? (
            <div className="lovli-glass rounded-2xl p-6 text-center text-sm text-lovli-text-muted">
              Loading…
            </div>
          ) : cards.length === 0 ? (
            <div className="lovli-glass rounded-2xl p-5" data-testid="memory-empty-state">
              <h3 className="font-display text-base font-semibold text-lovli-text">
                No memories yet
              </h3>
              <p className="mt-1 text-sm text-lovli-text-muted">
                Save the little things so Lovli can suggest better replies later.
              </p>
              <div className="mt-4">
                <PreviewExample />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {cards.map((c) => (
                <MemoryListItem
                  key={c.id}
                  card={c}
                  onEdit={(card) => {
                    setEditing(card);
                    setOpen(true);
                  }}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </section>

        <section className="lovli-glass rounded-2xl p-5">
          <h2 className="font-display text-lg font-semibold text-lovli-text">Coming soon</h2>
          <p className="mt-1 text-sm text-lovli-text-muted">
            Auto-summarize chats, gentle reminders, and date ideas — powered by your memories.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {['AI summary of a memory', 'Reminders', 'Date ideas'].map((label) => (
              <button
                key={label}
                type="button"
                disabled
                className="inline-flex items-center gap-1.5 rounded-full border border-lovli-border bg-lovli-card px-3 py-1.5 text-xs text-lovli-text-muted"
                data-testid="memory-coming-soon-button"
              >
                <Lock className="h-3 w-3" /> {label}
              </button>
            ))}
          </div>
        </section>

        <section className="lovli-glass rounded-2xl p-5">
          <h2 className="font-display text-lg font-semibold text-lovli-text">
            Get early access to the AI memory layer
          </h2>
          <p className="mt-1 text-sm text-lovli-text-muted">
            We'll let you in early when AI summaries, reminders, and date ideas go live.
          </p>
          <div className="mt-4">
            <EarlyAccessForm
              type="memory"
              source="memory-page"
              defaultEmail={user?.email || ''}
              question="What would you want Lovli Memory to remember? (dates, likes, chat context, date ideas, reminders, other)"
              successMessage="You're on the Memory early access list."
              testIdPrefix="memory-early-access"
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
