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
            className={`min-h-[36px] rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
              active
                ? 'lovli-chip-active'
                : 'border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/[0.06] hover:border-white/14'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
