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
import {
  BookHeart,
  NotebookText,
  Plus,
  Pencil,
  Trash2,
  Lock,
  LockKeyhole,
} from 'lucide-react';

const GOAL_OPTIONS = ['Friendship', 'Talking', 'Dating', 'Serious', 'Impress first'];
const SITUATION_OPTIONS = [
  'Not connected yet',
  'Texting',
  'Talking',
  'Dating',
  'Complicated',
];

// Backend field shape is preserved — only UI labels change.
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
  'bg-lovli-card border-lovli-border text-lovli-text placeholder:text-lovli-text-faint h-11 rounded-xl';

const TEXTAREA_CLS =
  'bg-lovli-card border-lovli-border text-lovli-text placeholder:text-lovli-text-faint rounded-xl';

/**
 * One stacked journal entry inside a memory card.
 * Only renders when value is truthy — empty fields are hidden entirely.
 */
function JournalLine({ label, value }) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-lovli-text-muted">
        {label}
      </p>
      <p className="text-[14px] leading-relaxed text-lovli-text break-words">
        {value}
      </p>
    </div>
  );
}

/**
 * Visual sub-section inside the Add Memory dialog — soft header + the form fields.
 */
function FormSection({ title, description, children }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-[13px] font-semibold text-lovli-text">{title}</h3>
        {description && (
          <p className="mt-0.5 text-[11.5px] text-lovli-text-muted">{description}</p>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

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
      toast.error('Add a nickname so you can find this memory later.');
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
        className="max-w-md max-h-[88vh] overflow-y-auto rounded-3xl border-lovli-border bg-lovli-card-2/95 backdrop-blur-2xl"
        data-testid="memory-form"
      >
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-lovli-text text-[20px] font-display">
            {isEdit ? 'Edit memory' : 'Add Memory'}
          </DialogTitle>
          <p className="text-[12.5px] text-lovli-text-muted leading-relaxed">
            Use nicknames, not real names. You can edit or delete this anytime.
          </p>
        </DialogHeader>

        <div className="space-y-6 pt-1">
          {/* Section 1 — Basic context */}
          <FormSection title="Basic context" description="Who this is and where you are with them.">
            <div className="space-y-1.5">
              <Label className="text-lovli-text-soft text-[12.5px]" htmlFor="nickname">
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
              <Label className="text-lovli-text-soft text-[12.5px]">
                Current situation
              </Label>
              <ChipGroup
                options={SITUATION_OPTIONS}
                value={form.current_situation}
                onChange={(v) => set('current_situation', v)}
                testId="memory-form-situation-toggle"
                ariaLabel="Current situation"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-lovli-text-soft text-[12.5px]">
                What do you want with this person?
              </Label>
              <ChipGroup
                options={GOAL_OPTIONS}
                value={form.goal}
                onChange={(v) => set('goal', v)}
                testId="memory-form-goal-toggle"
                ariaLabel="Goal"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-lovli-text-soft text-[12.5px]">
                  Relationship stage{' '}
                  <span className="text-lovli-text-faint font-normal">(optional)</span>
                </Label>
                <Input
                  value={form.relationship_stage}
                  onChange={(e) => set('relationship_stage', e.target.value)}
                  placeholder="e.g. early days"
                  className={INPUT_CLS}
                  data-testid="memory-form-stage-input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-lovli-text-soft text-[12.5px]">Where you met</Label>
                <Input
                  value={form.where_met}
                  onChange={(e) => set('where_met', e.target.value)}
                  placeholder="Hinge, friend’s party…"
                  className={INPUT_CLS}
                  data-testid="memory-form-where-input"
                />
              </div>
            </div>
          </FormSection>

          {/* Section 2 — Good to remember */}
          <FormSection
            title="Good to remember"
            description="The little things that make replies feel thoughtful."
          >
            <div className="space-y-1.5">
              <Label className="text-lovli-text-soft text-[12.5px]">Good to remember</Label>
              <Input
                value={form.likes}
                onChange={(e) => set('likes', e.target.value)}
                placeholder="chai, indie music, quiet cafes…"
                className={INPUT_CLS}
                data-testid="memory-form-likes-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-lovli-text-soft text-[12.5px]">Things to avoid</Label>
              <Input
                value={form.dislikes}
                onChange={(e) => set('dislikes', e.target.value)}
                placeholder="too much flirting, pressure to meet…"
                className={INPUT_CLS}
                data-testid="memory-form-avoid-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-lovli-text-soft text-[12.5px]">
                How they usually talk
              </Label>
              <Input
                value={form.communication_style}
                onChange={(e) => set('communication_style', e.target.value)}
                placeholder="funny, calm, career-focused…"
                className={INPUT_CLS}
                data-testid="memory-form-style-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-lovli-text-soft text-[12.5px]">
                Inside jokes{' '}
                <span className="text-lovli-text-faint font-normal">(optional)</span>
              </Label>
              <Input
                value={form.inside_jokes}
                onChange={(e) => set('inside_jokes', e.target.value)}
                placeholder="anything just between you two"
                className={INPUT_CLS}
                data-testid="memory-form-jokes-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-lovli-text-soft text-[12.5px]">Important moments</Label>
              <Input
                value={form.important_dates}
                onChange={(e) => set('important_dates', e.target.value)}
                placeholder="interview Friday, birthday next month…"
                className={INPUT_CLS}
                data-testid="memory-form-important-input"
              />
            </div>
          </FormSection>

          {/* Section 3 — Your notes */}
          <FormSection
            title="Your notes"
            description="Private to you. Lovli uses these only when you ask for a reply."
          >
            <div className="space-y-1.5">
              <Label className="text-lovli-text-soft text-[12.5px]">
                What feels right{' '}
                <span className="text-lovli-text-faint font-normal">(optional)</span>
              </Label>
              <Textarea
                value={form.best_approach}
                onChange={(e) => set('best_approach', e.target.value)}
                rows={2}
                placeholder="e.g. Light, respectful, playful — let her lead the pace."
                className={TEXTAREA_CLS}
                data-testid="memory-form-approach-textarea"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-lovli-text-soft text-[12.5px]">Your notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                rows={3}
                placeholder="Anything else worth remembering…"
                className={TEXTAREA_CLS}
                data-testid="memory-form-notes-textarea"
              />
            </div>
          </FormSection>

          <p className="inline-flex items-center gap-1.5 text-[11px] text-lovli-text-muted">
            <LockKeyhole className="h-3 w-3 text-lovli-lavender/80" />
            Private by default. You control what gets saved.
          </p>
        </div>

        <DialogFooter className="mt-2 gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-lovli-text-soft hover:bg-lovli-card hover:text-lovli-text rounded-full"
          >
            Cancel
          </Button>
          <Button
            type="button"
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

/**
 * Status pill rendered inside a memory card, when current_situation is set.
 * Plain dark fill with subtle lavender border — no heavy gradient.
 */
function StatusPill({ value }) {
  if (!value) return null;
  return (
    <span className="rounded-full border border-lovli-lavender/40 bg-lovli-lavender/10 px-2 py-0.5 text-[11px] text-lovli-text">
      {value}
    </span>
  );
}

function GoalPill({ value }) {
  if (!value) return null;
  return (
    <span className="rounded-full border border-lovli-border bg-lovli-card px-2 py-0.5 text-[11px] text-lovli-text-soft">
      {value}
    </span>
  );
}

function MemoryListItem({ card, onEdit, onDelete }) {
  return (
    <GlassCard className="p-5" data-testid="memory-card-item">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className="font-display text-[17px] font-semibold text-lovli-text break-words"
              data-testid="memory-card-nickname"
            >
              {card.nickname}
            </h3>
            <StatusPill value={card.current_situation} />
            <GoalPill value={card.goal} />
          </div>
          {(card.where_met || card.relationship_stage) && (
            <p className="mt-1.5 text-[12px] text-lovli-text-muted">
              {[card.relationship_stage, card.where_met].filter(Boolean).join(' · ')}
            </p>
          )}
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

      <div className="mt-4 space-y-3">
        <JournalLine label="Good to remember" value={card.likes} />
        <JournalLine label="Things to avoid" value={card.dislikes} />
        <JournalLine label="How they usually talk" value={card.communication_style} />
        <JournalLine label="Inside jokes" value={card.inside_jokes} />
        <JournalLine label="Important moments" value={card.important_dates} />
        <JournalLine label="What feels right" value={card.best_approach} />
        <JournalLine label="Your notes" value={card.notes} />
      </div>
    </GlassCard>
  );
}

function PreviewExample() {
  return (
    <GlassCard className="p-5" data-testid="memory-preview-card">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-lovli-lavender/35 bg-lovli-lavender/10">
          <NotebookText className="h-4 w-4 text-lovli-lavender" />
        </span>
        <h3 className="font-display text-[17px] font-semibold text-lovli-text">
          Coffee Girl
        </h3>
        <StatusPill value="Talking" />
        <GoalPill value="Dating" />
      </div>
      <p className="mt-1.5 text-[12px] text-lovli-text-muted">early days · Hinge</p>
      <div className="mt-4 space-y-3">
        <JournalLine label="Good to remember" value="Chai, indie music, quiet cafes" />
        <JournalLine
          label="Things to avoid"
          value="Too much flirting, pressure to meet"
        />
        <JournalLine label="Important moments" value="Interview on Friday" />
        <JournalLine label="What feels right" value="Light, respectful, playful" />
        <JournalLine
          label="Your notes"
          value="Inside joke: world domination. Ask about her interview, keep it easy."
        />
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
      toast.error('Could not load your memories.');
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
        {/* Hero — calm, warm, journal-positioned. */}
        <section
          className="relative overflow-hidden rounded-3xl border border-lovli-border bg-lovli-card-2/70 p-5"
          data-testid="memory-hero"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(60% 50% at 90% 10%, rgba(167,139,250,0.12), transparent 60%), radial-gradient(50% 50% at 10% 100%, rgba(56,189,248,0.06), transparent 60%)',
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-lovli-lavender/35 bg-lovli-lavender/10">
                <BookHeart className="h-4 w-4 text-lovli-lavender" />
              </span>
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-lovli-text-muted">
                Lovli Memory
              </span>
            </div>
            <h1 className="mt-3 font-display text-[22px] font-semibold leading-tight text-lovli-text">
              Remember meaningful details.
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-lovli-text-soft">
              Save the little things they mention so future replies feel more thoughtful.
            </p>
            <p
              className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] text-lovli-text-muted"
              data-testid="memory-privacy-cue"
            >
              <LockKeyhole className="h-3 w-3 text-lovli-lavender/80" />
              Private by default. You control what gets saved.
            </p>
          </div>
        </section>

        {/* Memories list */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-[16px] font-semibold text-lovli-text">
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
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Memory
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
              <h3 className="font-display text-[16px] font-semibold text-lovli-text">
                No memories yet
              </h3>
              <p className="mt-1 text-[13px] text-lovli-text-muted">
                Save the little things so Lovli can suggest replies that feel more thoughtful.
              </p>
              <p className="mt-3 text-[11.5px] uppercase tracking-[0.08em] text-lovli-text-faint">
                A preview
              </p>
              <div className="mt-2">
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

        {/* Coming soon — kept as existing placeholder for future AI memory layer. */}
        <section className="lovli-glass rounded-2xl p-5">
          <h2 className="font-display text-[16px] font-semibold text-lovli-text">
            Coming soon
          </h2>
          <p className="mt-1 text-[13px] text-lovli-text-muted">
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

        {/* Early access — existing waitlist form, unchanged behavior. */}
        <section className="lovli-glass rounded-2xl p-5">
          <h2 className="font-display text-[16px] font-semibold text-lovli-text">
            Get early access to the AI memory layer
          </h2>
          <p className="mt-1 text-[13px] text-lovli-text-muted">
            We’ll let you in early when the AI memory layer goes live.
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
