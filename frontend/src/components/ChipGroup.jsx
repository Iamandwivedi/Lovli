import React from 'react';

export default function ChipGroup({ options, value, onChange, testId, ariaLabel }) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="radiogroup"
      aria-label={ariaLabel}
      data-testid={testId}
    >
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt)}
            data-testid={`${testId}-${opt.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            className={`min-h-[36px] rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lovli-lavender/55 ${
              active
                ? 'lovli-chip-active'
                : 'border-lovli-border bg-lovli-card text-lovli-text-soft/85 hover:bg-lovli-card-2 hover:border-lovli-border-strong hover:text-lovli-text'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
