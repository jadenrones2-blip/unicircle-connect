

# Landing Page Visual Overhaul — Webild-Inspired with UniCircle Twist

## What Webild Does Well (that we'll adapt)
- Immersive landscape/nature background behind the hero
- Animated text marquee ticker ("Generate it. customize it. launch it.")
- Sound effects on button clicks, hovers, and interactions
- Word-by-word animated section headers that reveal on scroll
- Glassmorphism cards (frosted glass effect)
- Large, bold, minimal hero copy
- Smooth parallax-like scroll sections

## The UniCircle Twist
- Keep the gold-on-dark Porsche palette instead of Webild's blue/green nature theme
- Abstract geometric/circuit-board inspired background (gold mesh on dark) instead of nature landscapes
- Sound design: mechanical precision sounds (subtle clicks, gold "ding") instead of generic pops
- Gold particle/sparkle effects on hover instead of plain hover states
- Animated gold racing stripe as a recurring motif

## Implementation Steps

### 1. Create a `useSoundEffects` hook
- Preload 3-4 short audio files (click, hover, success, whoosh) using the Web Audio API
- Expose `playClick()`, `playHover()`, `playSuccess()` functions
- Keep sounds short (< 200ms), subtle, and premium-feeling
- Store small base64-encoded audio or generate tones programmatically (no external files needed)

### 2. Create an `AnimatedWords` component
- Accepts a string and splits it into individual words
- Each word animates in (fade + slight translateY) on scroll via framer-motion `whileInView`
- Staggered delay per word (0.05s increments)
- Used for all section headings throughout the page

### 3. Create a `TextMarquee` component
- Infinite horizontal scroll ticker (CSS animation)
- Displays repeated text like "Recruit. Evaluate. Decide." in uppercase, large, semi-transparent
- Positioned between hero and first section as a visual divider
- Gold gradient text on dark background

### 4. Redesign `HeroSection`
- Full-viewport dark background with subtle animated gold mesh/grid SVG pattern
- Larger, bolder headline using `AnimatedWords`
- Glassmorphism waitlist/CTA card (frosted glass: `bg-white/5 backdrop-blur-xl border border-white/10`)
- Add sound effects to CTA buttons
- Floating gold particles (extend existing `FloatingParticles` or create new)

### 5. Update all section components with glassmorphism cards
- Replace `bg-card border border-border` with `bg-card/30 backdrop-blur-md border border-white/10`
- Add subtle gold glow on hover (`hover:shadow-[0_0_30px_-5px_hsl(43_76%_52%/0.15)]`)
- Add sound effect on card hover (light tick sound)
- Use `AnimatedWords` for all section headings

### 6. Redesign `HowItWorksSection`
- Larger step cards with glassmorphism
- Animated connecting line that draws on scroll (framer-motion path animation)
- Step numbers with gold gradient background

### 7. Update `FAQSection`
- Add click sound on accordion toggle
- Smoother open/close animation
- Glassmorphism accordion container

### 8. Update `CTASection`
- Full-width dark section with animated gold gradient mesh background
- Glassmorphism CTA card centered
- Sound effect on button click

### 9. Update `Header`
- Add subtle hover sound to nav links
- Glassmorphism header background (`bg-background/60 backdrop-blur-xl`)

### 10. Update `Footer`
- Subtle glassmorphism styling
- Add hover sounds to links

## Files to Create
- `src/hooks/useSoundEffects.ts`
- `src/components/AnimatedWords.tsx`
- `src/components/TextMarquee.tsx`
- `src/components/GoldMeshBackground.tsx`

## Files to Modify
- `src/components/HeroSection.tsx`
- `src/components/ProblemSection.tsx`
- `src/components/SolutionSection.tsx`
- `src/components/HowItWorksSection.tsx`
- `src/components/BenefitsSection.tsx`
- `src/components/WhyUnicircleSection.tsx`
- `src/components/FAQSection.tsx`
- `src/components/CTASection.tsx`
- `src/components/Header.tsx`
- `src/components/Footer.tsx`
- `src/index.css` (glassmorphism utility classes)

