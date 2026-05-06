{
  "product": {
    "name": "Lovli",
    "tagline": "AI dating coach for Indian chats",
    "design_personality": {
      "keywords": [
        "dark premium AI",
        "liquid glass",
        "futuristic minimal",
        "warm + trustworthy",
        "privacy-first",
        "Hinglish-aware",
        "investor-presentable"
      ],
      "anti_patterns": [
        "no red/pink romance theme",
        "no cheesy dating visuals",
        "no pickup-artist vibe",
        "no manipulative/creepy UI",
        "no clutter",
        "no childish motion"
      ]
    }
  },

  "design_tokens": {
    "notes": [
      "Use dark solids for reading areas; reserve gradients for hero accents + primary CTA only (<=20% viewport).",
      "Prefer glass surfaces with subtle borders + controlled glow; avoid neon overload.",
      "All tokens below are intended to map into /src/index.css :root and .dark variables (HSL values for shadcn)."
    ],

    "color": {
      "mode": "dark-first",
      "css_custom_properties": {
        "--bg-0": "#070812",
        "--bg-1": "#0A0B18",
        "--bg-2": "#0E1024",

        "--surface-glass": "rgba(255,255,255,0.06)",
        "--surface-glass-2": "rgba(255,255,255,0.08)",
        "--surface-solid": "#0D1022",

        "--border-subtle": "rgba(255,255,255,0.10)",
        "--border-strong": "rgba(255,255,255,0.16)",

        "--text-1": "rgba(255,255,255,0.92)",
        "--text-2": "rgba(255,255,255,0.72)",
        "--text-3": "rgba(255,255,255,0.56)",

        "--glow-violet": "rgba(168,85,247,0.35)",
        "--glow-indigo": "rgba(99,102,241,0.35)",
        "--glow-blue": "rgba(56,189,248,0.22)",

        "--primary-violet": "#A855F7",
        "--primary-indigo": "#6366F1",
        "--primary-blue": "#38BDF8",

        "--success": "#34D399",
        "--warning": "#FBBF24",
        "--error": "#FB7185",

        "--focus-ring": "rgba(99,102,241,0.55)",
        "--shadow-elev": "0 18px 60px rgba(0,0,0,0.55)",
        "--shadow-glow": "0 0 0 1px rgba(255,255,255,0.08), 0 18px 60px rgba(0,0,0,0.55), 0 0 40px rgba(99,102,241,0.18)"
      },

      "shadcn_hsl_mapping_for_index_css": {
        "instructions": "Replace the existing .dark block in /src/index.css with these HSL values (keep structure).",
        "--background": "232 55% 5%",
        "--foreground": "0 0% 98%",
        "--card": "232 45% 8%",
        "--card-foreground": "0 0% 98%",
        "--popover": "232 45% 8%",
        "--popover-foreground": "0 0% 98%",
        "--primary": "252 92% 70%",
        "--primary-foreground": "232 55% 8%",
        "--secondary": "232 28% 14%",
        "--secondary-foreground": "0 0% 98%",
        "--muted": "232 22% 14%",
        "--muted-foreground": "0 0% 70%",
        "--accent": "232 28% 14%",
        "--accent-foreground": "0 0% 98%",
        "--destructive": "346 84% 62%",
        "--destructive-foreground": "0 0% 98%",
        "--border": "0 0% 100% / 0.10",
        "--input": "0 0% 100% / 0.12",
        "--ring": "244 92% 70%",
        "--radius": "1rem"
      },

      "gradients": {
        "primary_cta": {
          "tailwind": "bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-400",
          "css": "linear-gradient(90deg, #A855F7 0%, #6366F1 45%, #38BDF8 100%)",
          "usage": "Primary CTA only (Generate replies). Not for text-heavy areas."
        },
        "hero_aurora_overlay": {
          "tailwind": "bg-[radial-gradient(60%_60%_at_20%_10%,rgba(168,85,247,0.22)_0%,rgba(168,85,247,0)_60%),radial-gradient(55%_55%_at_80%_0%,rgba(99,102,241,0.18)_0%,rgba(99,102,241,0)_55%),radial-gradient(45%_45%_at_70%_90%,rgba(56,189,248,0.12)_0%,rgba(56,189,248,0)_60%)]",
          "usage": "Decorative overlay behind header/hero only; keep under 20% viewport height."
        }
      }
    },

    "typography": {
      "font_pairing": {
        "display": "Space Grotesk (600–700)",
        "body": "Figtree (400–600)",
        "fallback_stack": "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
      },
      "google_fonts_import": {
        "instructions": "Add to /public/index.html <head> or via CSS import in /src/index.css.",
        "href": "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Figtree:wght@400;500;600&display=swap"
      },
      "scale_tailwind": {
        "display": "text-4xl sm:text-5xl lg:text-6xl tracking-tight",
        "h1": "text-2xl sm:text-3xl font-semibold tracking-tight",
        "h2": "text-base md:text-lg text-white/70",
        "body": "text-sm sm:text-base text-white/80 leading-relaxed",
        "caption": "text-xs text-white/55"
      },
      "copy_tone": {
        "rules": [
          "Simple English, Hinglish-aware.",
          "Avoid slangy pickup lines; keep confident + respectful.",
          "Privacy copy should be calm and matter-of-fact."
        ],
        "microcopy_examples": {
          "uploader_privacy": "Only upload chats you’re comfortable sharing with Lovli.",
          "usage_counter": "{used} of 8 used today",
          "copy_toast": "Copied. Go send it.",
          "upgrade_modal_title": "You’ve hit today’s limit",
          "upgrade_modal_body": "Upgrade to Pro for more replies and faster iterations. No spam. Cancel anytime."
        }
      }
    },

    "spacing_and_radius": {
      "spacing": {
        "section_y": "py-6 sm:py-8",
        "card_padding": "p-4 sm:p-5",
        "stack_gap": "gap-3 sm:gap-4",
        "chip_gap": "gap-2",
        "thumb_targets": "min-h-[44px] min-w-[44px]"
      },
      "radius": {
        "app_shell": "rounded-[28px]",
        "glass_card": "rounded-2xl",
        "input": "rounded-xl",
        "chip": "rounded-full",
        "button": "rounded-xl",
        "bottom_nav": "rounded-[22px]"
      },
      "shadow": {
        "glass": "shadow-[0_18px_60px_rgba(0,0,0,0.55)]",
        "glow": "shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_18px_60px_rgba(0,0,0,0.55),0_0_40px_rgba(99,102,241,0.18)]"
      }
    }
  },

  "recipes": {
    "app_background": {
      "tailwind": "bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(99,102,241,0.18),transparent_60%),radial-gradient(900px_500px_at_10%_20%,rgba(168,85,247,0.14),transparent_55%),radial-gradient(900px_500px_at_90%_30%,rgba(56,189,248,0.10),transparent_55%)] bg-[#070812]",
      "noise_overlay": {
        "instructions": "Add a pseudo-element overlay on the app shell for subtle grain.",
        "tailwind": "after:content-[''] after:pointer-events-none after:absolute after:inset-0 after:bg-[url('/noise.png')] after:opacity-[0.06] after:mix-blend-overlay"
      }
    },

    "glass_card": {
      "base": "relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.55)]",
      "hover": "hover:border-white/15 hover:bg-white/[0.08]",
      "active": "active:scale-[0.99]",
      "inner_highlight": "before:content-[''] before:absolute before:inset-0 before:bg-[radial-gradient(120%_80%_at_20%_0%,rgba(255,255,255,0.10),transparent_55%)] before:pointer-events-none"
    },

    "buttons": {
      "primary_cta": {
        "use": "shadcn Button",
        "className": "min-h-[48px] w-full rounded-xl bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-400 text-white shadow-[0_10px_30px_rgba(99,102,241,0.25)] hover:brightness-[1.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 focus-visible:ring-offset-0 active:scale-[0.99]",
        "data_testid": "generate-replies-button"
      },
      "secondary": {
        "className": "min-h-[44px] rounded-xl border border-white/12 bg-white/[0.06] text-white/90 hover:bg-white/[0.08] hover:border-white/16 focus-visible:ring-2 focus-visible:ring-indigo-400/60 active:scale-[0.99]",
        "data_testid": "secondary-action-button"
      },
      "ghost": {
        "className": "min-h-[44px] rounded-xl bg-transparent text-white/80 hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-indigo-400/60",
        "data_testid": "ghost-action-button"
      },
      "destructive": {
        "className": "min-h-[44px] rounded-xl bg-rose-500/15 text-rose-200 border border-rose-400/20 hover:bg-rose-500/20 focus-visible:ring-2 focus-visible:ring-rose-400/50",
        "data_testid": "destructive-action-button"
      },
      "disabled": {
        "className": "opacity-50 cursor-not-allowed",
        "copy": "Coming soon"
      }
    },

    "chips": {
      "component": "toggle-group.jsx (single-select) OR custom ChipButton using Button variant=ghost",
      "idle": "rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/75 hover:bg-white/[0.06] hover:border-white/14",
      "selected": "rounded-full border border-indigo-300/25 bg-gradient-to-r from-violet-500/20 via-indigo-500/18 to-sky-400/14 text-white shadow-[0_0_0_1px_rgba(99,102,241,0.25),0_10px_30px_rgba(99,102,241,0.12)]",
      "disabled": "opacity-50 cursor-not-allowed",
      "platform_chip_testid": "platform-chip",
      "vibe_chip_testid": "vibe-chip"
    },

    "bottom_nav": {
      "layout": "Sticky bottom bar inside authenticated shell; always visible on /app, /pro, /memory.",
      "container": "fixed bottom-3 left-1/2 z-50 w-[min(420px,calc(100vw-24px))] -translate-x-1/2",
      "bar": "rounded-[22px] border border-white/12 bg-white/[0.06] backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.55)]",
      "item": "flex flex-1 flex-col items-center justify-center gap-1 py-3 text-[11px] text-white/65",
      "active": "text-white relative",
      "active_indicator": "after:content-[''] after:absolute after:-top-1 after:h-1 after:w-10 after:rounded-full after:bg-gradient-to-r after:from-violet-500 after:via-indigo-500 after:to-sky-400 after:shadow-[0_0_24px_rgba(99,102,241,0.35)]",
      "icons": "lucide-react (MessageSquareText, Sparkles, BrainCircuit or Vault)",
      "data_testid": {
        "reply": "bottom-nav-reply",
        "pro": "bottom-nav-pro",
        "memory": "bottom-nav-memory"
      }
    },

    "loading_state": {
      "microcopy_rotation": [
        "Reading the vibe…",
        "Finding natural replies…",
        "Making it sound like you…",
        "Keeping it respectful…"
      ],
      "motion": {
        "pattern": "shimmer bar + dot pulse; opacity/translate only",
        "framer": {
          "shimmer": "animate background-position on a thin gradient bar (CSS keyframes) OR framer-motion x translate",
          "dots": "3 dots with staggered opacity (0.2 -> 1 -> 0.2)"
        }
      },
      "tailwind_skeleton": "h-2 w-full rounded-full bg-white/10 overflow-hidden relative before:content-[''] before:absolute before:inset-0 before:bg-[linear-gradient(90deg,transparent,rgba(99,102,241,0.35),transparent)] before:animate-[shimmer_1.2s_infinite]"
    },

    "reply_result_card": {
      "container": "rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-4 shadow-[0_18px_60px_rgba(0,0,0,0.55)]",
      "vibe_badge": "inline-flex items-center rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/75",
      "reply_text": "mt-3 text-[15px] leading-relaxed text-white/90",
      "actions_row": "mt-4 flex flex-wrap gap-2",
      "primary_action": "Copy (Button size=sm) should be visually strongest",
      "data_testid": {
        "card": "reply-result-card",
        "copy": "reply-copy-button",
        "save": "reply-save-button",
        "regen": "reply-regenerate-button",
        "feedback": "reply-feedback-button"
      }
    },

    "upgrade_modal": {
      "component": "dialog.jsx OR drawer.jsx on mobile",
      "tone": "Premium, calm, not pushy. Emphasize privacy + control.",
      "container": "rounded-2xl border border-white/12 bg-[#0B0D1A]/80 backdrop-blur-2xl shadow-[0_18px_60px_rgba(0,0,0,0.65)]",
      "header": "text-white font-semibold",
      "body": "text-white/70",
      "cta": "Primary gradient button + secondary ghost 'Not now'",
      "data_testid": {
        "modal": "upgrade-modal",
        "cta": "upgrade-modal-cta-button",
        "dismiss": "upgrade-modal-dismiss-button"
      }
    },

    "empty_and_error_states": {
      "empty": {
        "pattern": "Glass card with icon + 1-line promise + 1 action.",
        "example": "No memories yet. Save the little things so you never blank.",
        "cta": "Create memory"
      },
      "error": {
        "pattern": "Inline alert (shadcn alert.jsx) with calm copy + retry.",
        "tailwind": "border-rose-400/20 bg-rose-500/10 text-rose-100"
      }
    }
  },

  "page_blueprints": {
    "global_shell": {
      "mobile": {
        "header": "Sticky top header: Lovli wordmark (left), plan badge (center/right), settings icon button (right).",
        "content": "Scrollable content with bottom padding to clear bottom nav (pb-24).",
        "bottom_nav": "Always visible; glass bar floating above safe area."
      },
      "desktop": {
        "treatment": "Centered premium dashboard: max-w-[980px] with an inner phone-like shell max-w-[420px] for core flows; keep bottom nav metaphor inside the shell.",
        "layout": "Page background full-bleed aurora; content centered; avoid sidebar.",
        "tailwind": "min-h-screen flex justify-center px-3 py-6"
      }
    },

    "/login": {
      "layout": "Centered glass card with Lovli mark, headline, email/password, Google one-tap, privacy reassurance.",
      "components": ["card.jsx", "input.jsx", "button.jsx", "separator.jsx"],
      "data_testid": {
        "email": "login-email-input",
        "password": "login-password-input",
        "submit": "login-submit-button",
        "google": "login-google-button"
      }
    },

    "/signup": {
      "layout": "Same as login; include name field; keep copy minimal.",
      "components": ["card.jsx", "input.jsx", "button.jsx"],
      "data_testid": {
        "name": "signup-name-input",
        "email": "signup-email-input",
        "password": "signup-password-input",
        "submit": "signup-submit-button",
        "google": "signup-google-button"
      }
    },

    "/onboarding": {
      "layout": "3-step mini flow in a glass card; skip button top-right.",
      "components": ["card.jsx", "toggle-group.jsx", "button.jsx", "progress.jsx"],
      "data_testid": {
        "skip": "onboarding-skip-button",
        "platform": "onboarding-platform-toggle",
        "style": "onboarding-style-toggle",
        "language": "onboarding-language-toggle",
        "continue": "onboarding-continue-button"
      }
    },

    "/app (Reply)": {
      "sections": [
        "Uploader card (tap/drag-drop) + privacy line",
        "Optional paste text textarea + optional note",
        "Platform chips (premium) + Vibe chips (single select)",
        "Usage counter + Generate CTA",
        "Below: empty state explaining what you’ll get"
      ],
      "components": [
        "card.jsx",
        "textarea.jsx",
        "toggle-group.jsx",
        "button.jsx",
        "sonner.jsx"
      ],
      "data_testid": {
        "uploader": "reply-screenshot-uploader",
        "remove_image": "reply-screenshot-remove-button",
        "paste": "reply-paste-textarea",
        "note": "reply-note-textarea",
        "platform": "reply-platform-toggle",
        "vibe": "reply-vibe-toggle",
        "usage": "reply-usage-counter",
        "generate": "generate-replies-button"
      }
    },

    "/app (Reply with results)": {
      "layout": "Same page; results appear below CTA with smooth reveal.",
      "results": "3 reply cards; Copy is primary; Save/Regenerate/Feedback as chips.",
      "motion": "Animate in cards with opacity + y: 8 -> 0 over 220ms; stagger 60ms."
    },

    "/pro": {
      "layout": "Glass hero + comparison cards + early-access form.",
      "components": ["card.jsx", "table.jsx", "input.jsx", "textarea.jsx", "button.jsx"],
      "data_testid": {
        "email": "pro-early-access-email-input",
        "help": "pro-early-access-help-textarea",
        "submit": "pro-early-access-submit-button"
      }
    },

    "/memory": {
      "layout": "Hero + MemoryPreviewCard example + list of memory cards + create button.",
      "memory_preview_card": {
        "tone": "Private journal entry, not CRM.",
        "layout": "Title row (nickname + stage pill), then 2-column key/value grid, then 'Inside joke' + 'Next move' callout.",
        "tailwind": "rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-4",
        "example": {
          "nickname": "Coffee Girl",
          "stage": "Talking",
          "vibe": "Warm",
          "likes": "Cold brew, indie gigs",
          "avoid": "Late replies without context",
          "important_note": "She’s prepping for a product interview next week",
          "inside_joke": "‘Team no-sugar latte’",
          "best_approach": "Short, confident, curious questions",
          "next_move": "Suggest a quick coffee after her interview"
        }
      },
      "crud": {
        "components": ["dialog.jsx", "drawer.jsx", "input.jsx", "textarea.jsx", "button.jsx"],
        "data_testid": {
          "create": "memory-create-button",
          "edit": "memory-edit-button",
          "delete": "memory-delete-button",
          "form": "memory-form",
          "save": "memory-save-button"
        }
      },
      "coming_soon_buttons": {
        "style": "Disabled glass buttons with lock icon + tooltip 'Early access'.",
        "data_testid": "memory-coming-soon-button"
      }
    },

    "/settings": {
      "layout": "Stacked glass sections: Profile, Plan, Daily usage, Preferences, Privacy placeholders.",
      "components": ["card.jsx", "switch.jsx", "select.jsx", "button.jsx", "separator.jsx"],
      "data_testid": {
        "logout": "settings-logout-button",
        "timezone": "settings-timezone-select",
        "delete": "settings-delete-account-button"
      }
    },

    "/privacy and /terms": {
      "layout": "Readable long-form page on dark solid surface (no gradients). Use max-w-prose.",
      "components": ["card.jsx", "separator.jsx"],
      "tailwind": "prose prose-invert max-w-none",
      "data_testid": {
        "privacy": "privacy-page",
        "terms": "terms-page"
      }
    },

    "/early-access": {
      "layout": "Single glass card with form; reassure privacy + no spam.",
      "components": ["card.jsx", "input.jsx", "textarea.jsx", "button.jsx"],
      "data_testid": {
        "email": "early-access-email-input",
        "submit": "early-access-submit-button"
      }
    }
  },

  "component_path": {
    "primary_shadcn_components": [
      "/app/frontend/src/components/ui/button.jsx",
      "/app/frontend/src/components/ui/card.jsx",
      "/app/frontend/src/components/ui/input.jsx",
      "/app/frontend/src/components/ui/textarea.jsx",
      "/app/frontend/src/components/ui/toggle-group.jsx",
      "/app/frontend/src/components/ui/dialog.jsx",
      "/app/frontend/src/components/ui/drawer.jsx",
      "/app/frontend/src/components/ui/sonner.jsx",
      "/app/frontend/src/components/ui/alert.jsx",
      "/app/frontend/src/components/ui/progress.jsx",
      "/app/frontend/src/components/ui/separator.jsx",
      "/app/frontend/src/components/ui/tabs.jsx",
      "/app/frontend/src/components/ui/tooltip.jsx",
      "/app/frontend/src/components/ui/skeleton.jsx"
    ],
    "notes": [
      "Use drawer.jsx for mobile modals where appropriate (upgrade modal, memory create/edit).",
      "Use dialog.jsx for desktop modal presentation.",
      "Use toggle-group.jsx for platform/vibe chips (single-select)."
    ]
  },

  "libraries": {
    "framer_motion": {
      "use_cases": [
        "staggered reveal of reply cards",
        "press feedback on chips/buttons",
        "tab active indicator transitions"
      ],
      "motion_tokens": {
        "duration_fast": 0.18,
        "duration_base": 0.22,
        "ease": "[0.2, 0.8, 0.2, 1]",
        "spring": "{ type: 'spring', stiffness: 380, damping: 32, mass: 0.7 }"
      }
    },
    "lucide_react": {
      "icons": {
        "reply": "MessageSquareText",
        "pro": "Sparkles",
        "memory": "BrainCircuit (or Vault)",
        "settings": "Settings",
        "copy": "Copy",
        "upload": "Upload",
        "lock": "Lock"
      }
    }
  },

  "image_urls": {
    "background_textures": [
      {
        "url": "https://images.unsplash.com/photo-1652732280814-3b8461a5ab6e?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
        "category": "app-shell-ambient",
        "description": "Soft blue/violet bokeh texture for optional hero overlay (use as low-opacity background image, not full-bleed)."
      },
      {
        "url": "https://images.unsplash.com/photo-1615714145252-5360513726a4?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
        "category": "pro-hero-accent",
        "description": "Dark indigo/blue streak texture for Pro hero accent behind glass card (opacity <= 0.18)."
      },
      {
        "url": "https://images.unsplash.com/photo-1579547944082-fac44e416258?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
        "category": "auth-background",
        "description": "Minimal aurora purple gradient for auth pages; keep subtle and masked behind solid overlay."
      }
    ]
  },

  "instructions_to_main_agent": {
    "global": [
      "Set <html class='dark'> at app root; treat Lovli as dark-first.",
      "Replace default shadcn tokens in /src/index.css with the provided dark HSL mapping.",
      "Do NOT use transition: all. Only transition colors/opacity/shadow on interactive elements.",
      "Do NOT center-align the entire app container.",
      "All interactive + key informational elements MUST include data-testid in kebab-case.",
      "Use shadcn components from /src/components/ui (no raw HTML dropdowns/calendars/toasts).",
      "Use sonner for toasts (Copied. Go send it.)."
    ],
    "reply_tab": [
      "Keep Reply as default tab; results render inline below CTA.",
      "Uploader must support tap (mobile) + drag-drop (desktop) with preview + remove.",
      "Platform + vibe selectors should be ToggleGroup single-select chips with premium selected state.",
      "At 8/8 show Upgrade modal (Drawer on mobile, Dialog on desktop)."
    ],
    "desktop_decision": [
      "Keep bottom nav even on desktop, but place it inside a centered phone-shell (max-w ~420px) for premium focus.",
      "Optionally add a subtle top tab row on desktop only, but do not introduce a sidebar."
    ]
  },

  "general_ui_ux_design_guidelines": [
    "- You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms",
    "- You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text",
    "- NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json",
    "\n **GRADIENT RESTRICTION RULE**",
    "NEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc",
    "NEVER use dark gradients for logo, testimonial, footer etc",
    "NEVER let gradients cover more than 20% of the viewport.",
    "NEVER apply gradients to text-heavy content or reading areas.",
    "NEVER use gradients on small UI elements (<100px width).",
    "NEVER stack multiple gradient layers in the same viewport.",
    "\n**ENFORCEMENT RULE:**",
    "    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors",
    "\n**How and where to use:**",
    "   • Section backgrounds (not content backgrounds)",
    "   • Hero section header content. Eg: dark to light to dark color",
    "   • Decorative overlays and accent elements only",
    "   • Hero section with 2-3 mild color",
    "   • Gradients creation can be done for any angle say horizontal, vertical or diagonal",
    "\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**",
    "\n</Font Guidelines>",
    "\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead.",
    "   ",
    "- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.",
    "\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.",
    "   ",
    "- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly",
    "    Eg: - if it implies playful/energetic, choose a colorful scheme",
    "           - if it implies monochrome/minimal, choose a black–white/neutral scheme",
    "\n**Component Reuse:**",
    "\t- Prioritize using pre-existing components from src/components/ui when applicable",
    "\t- Create new components that match the style and conventions of existing components when needed",
    "\t- Examine existing components to understand the project's component patterns before creating new ones",
    "\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component",
    "\n**Best Practices:**",
    "\t- Use Shadcn/UI as the primary component library for consistency and accessibility",
    "\t- Import path: ./components/[component-name]",
    "\n**Export Conventions:**",
    "\t- Components MUST use named exports (export const ComponentName = ...)",
    "\t- Pages MUST use default exports (export default function PageName() {...})",
    "\n**Toasts:**",
    "  - Use `sonner` for toasts\"",
    "  - Sonner component are located in `/app/src/components/ui/sonner.tsx`",
    "\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals."
  ]
}
