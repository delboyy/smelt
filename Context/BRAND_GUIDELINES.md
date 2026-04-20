# Brand Guidelines

## Name

**Smelt**

Pronounced: /smɛlt/ (rhymes with "felt")

To smelt is to extract pure, usable metal from raw ore by heating it. This is exactly what the product does: takes raw, messy data and produces clean, usable output.

## Domain

**smelt.fyi**

The `.fyi` extension reinforces the product's purpose: "for your information" — here's your clean data.

## Tagline

**Raw data in. Pure data out.**

Short, symmetrical, memorable. Describes the product in six words.

## Secondary taglines (for specific contexts)

- "Just smelt it." — casual, action-oriented (CTA buttons, social media)
- "Drop messy data. Get it back clean." — descriptive (landing page)
- "Your data, refined." — premium (Enterprise materials)
- "Clean data in 60 seconds." — performance-focused (ads)

## Tone of voice

**Confident, direct, no-nonsense.**

Smelt speaks like a skilled craftsperson — competent, unpretentious, focused on results. Not corporate. Not cutesy. Not overly technical.

**Do:**
- "Drop your file. We'll handle the mess."
- "2,847 rows cleaned. 14 duplicates removed. 0 errors."
- "Your data had 23 issues. We fixed all of them."

**Don't:**
- "Leverage our AI-powered data quality management solution to optimize your data lifecycle." (corporate jargon)
- "Oopsie! Looks like your data is a bit messy!" (too cutesy)
- "Utilizing advanced NLP-based schema inference with deterministic ETL execution..." (too technical)

## Visual identity

### Color palette

The palette is inspired by metallurgy — dark, warm, industrial.

| Name | Hex | Usage |
|------|-----|-------|
| **Background** | `#09090b` | Main app background |
| **Surface** | `#18181b` | Cards, panels, elevated surfaces |
| **Surface Alt** | `#1c1c20` | Table headers, secondary surfaces |
| **Border** | `#27272a` | Default borders |
| **Border Light** | `#3f3f46` | Hover borders, dividers |
| **Amber (primary accent)** | `#d97706` | Primary actions, highlights, logo |
| **Copper** | `#c2855a` | Gradient endpoint, secondary accent |
| **Amber Dim** | `#b45309` | Active states |
| **Text Primary** | `#fafafa` | Headings, primary content |
| **Text Secondary** | `#a1a1aa` | Body text, descriptions |
| **Text Tertiary** | `#71717a` | Labels, hints, disabled |
| **Green** | `#22c55e` | Success, clean data, positive changes |
| **Red** | `#ef4444` | Errors, invalid data, removed items |
| **Blue** | `#3b82f6` | Normalized changes, info |
| **Amber Status** | `#f59e0b` | Warnings, duplicates |

### Typography

| Role | Font | Weight | Size |
|------|------|--------|------|
| **Display / headings** | DM Sans | 700 (Bold) | 24-28px |
| **Body text** | DM Sans | 400-500 | 13-14px |
| **Code / data** | DM Mono | 400-500 | 11-12px |
| **Labels / caps** | DM Sans | 500-600 | 10-11px, uppercase, letter-spacing: 1px |

DM Sans and DM Mono are both from the same superfamily, giving a cohesive but distinctive look. They avoid the overused Inter/Roboto defaults while remaining highly readable.

### Logo

The logo mark is a rounded square with the letter "S" in the center, using the amber-to-copper gradient:

```
┌─────────┐
│         │
│    S    │  ← DM Mono, Bold, #09090b on gradient background
│         │
└─────────┘
   Background: linear-gradient(135deg, #d97706, #c2855a)
   Border-radius: 7px
```

The wordmark "Smelt" appears to the right in DM Sans Bold, with the tagline below in DM Sans Regular, text-tertiary color.

### UI patterns

- **Dark mode only** — the app is always dark. No light mode toggle. This is a deliberate brand choice that reinforces the industrial/forge aesthetic.
- **Cards** — `border-radius: 10px`, `border: 1px solid #27272a`, `background: #18181b`.
- **Buttons (primary)** — Gradient background `linear-gradient(135deg, #d97706, #c2855a)`, dark text. No border.
- **Buttons (secondary)** — Transparent background, `border: 1px solid #27272a`, text-secondary color.
- **Badges** — Pill-shaped (`border-radius: 100px`), colored background at 8% opacity, text in the full color, 1px border at 20% opacity.
- **Tables** — Monospace font (DM Mono), sticky header row, alternating subtle row highlights on hover.
- **Animations** — Subtle fade-in (0.35s ease) on step transitions. Spinner for processing. No bouncing, no excessive motion.

### Imagery

Smelt does not use stock photos, illustrations, or decorative imagery. The product IS the visual — clean data tables, diff views, and schema displays are the hero content. Screenshots of the actual product are the primary marketing asset.

### Social media

- **Twitter/X handle:** @smeltfyi
- **Profile image:** Logo mark (gradient square with S)
- **Banner:** Dark background with tagline "Raw data in. Pure data out." in large DM Sans Bold
- **Tone:** Short, punchy posts. Show before/after data transformations. No emojis in brand posts.
