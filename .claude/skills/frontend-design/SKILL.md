---
name: frontend-design
description: Produce production-grade visual changes for Optimizely A/B test variants by editing page/changes.js directly. Use this skill when the user asks to add or restyle any visual element on the fetched page — banners, CTAs, modals, sticky bars, layout shifts, new components, restyled buttons, copy-with-styling. NOT for pure deletions ("hide X") or text-only edits, which don't need design thinking. Generates polished, intentional code that lives inside the existing brand and avoids generic AI aesthetics.
---

Based on the canonical Anthropic frontend-design skill, reframed for brand-extension on existing pages rather than greenfield interface design. The structure is preserved; the aesthetic guidance is rewritten so the existing brand is a hard constraint, not a starting point you can override.

This skill guides creation of production-grade visual changes that live inside an existing brand. Implement real working code in `page/changes.js` with exceptional attention to detail.

The user is modifying a page already fetched into `page/original.html`. Your job is to produce the variant JS in `page/changes.js` that — once pasted into Optimizely's Custom Code box — applies the change live.

## Output contract — read first

- Edit exactly **one** file: `page/changes.js`.
- Do **not** create files anywhere else. No `spec.html`, no `preview.html`, no `notes.md`, nothing under `.claude/skills/**` or `page/` other than `changes.js`.
- Do **not** stop after producing HTML+CSS as a "spec". The deliverable IS the working changes.js — translate as you design, not after.
- When `page/changes.js` is updated, your final reply is one line: `Done — refresh http://localhost:3000 to see it.` Then stop. Do not summarise the design.
- Do not auto-QA. Never call `webapp-testing` or any `chrome-devtools` MCP tool after editing. The user QAs the preview themselves.
- Stay within the JS rules in `CLAUDE.md` (ES2015 ceiling — no object spread, async/await, optional chaining, nullish coalescing). Use `injectStyles` for CSS and `waitForElement` for DOM ops — both helpers are pre-defined in every starter `changes.js`.

## Scope discipline — only touch what was asked

The aesthetic guidance below is for executing **the requested change** with high quality. It is **not** a license to redesign the surrounding page.

- Modify only the element(s) the user named. If they asked for a banner, ship the banner — do not also rewrite the article headline, restyle the existing CTA, or "improve" neighbouring sections.
- If you spot something else that looks suboptimal on the page, **leave it alone** unless the user asked. Flag it in your reply for them to decide on next time.
- Pulling brand cues (palette, typography) from the existing page is encouraged. **Replacing** existing brand elements is not, unless explicitly requested.
- When in doubt, prefer the smaller intervention. The user can always ask for more.

## Pull project context first (cheap, do not skip)

Before committing to a direction, look at what the existing page is. Read or grep `page/original.html` for:
- Existing palette (hex colors used by the brand).
- Existing typography (font-family declarations).
- `dataLayer` brand/subcategory hints if present (e.g. `"brand":"…","subcategory":"…"`).

Anchor design choices in what's already there. The variant should feel like part of the site, not a foreign element — unless the brief is explicitly to break with the brand.

---

## Design Thinking

Before coding, read the existing page and pick a focused expression *inside* the brand it already establishes:

- **Purpose**: What does this change need to do? Who'll act on it?
- **Brand register**: Read the existing tone from `page/original.html` — refined and minimal, bold and editorial, soft and reassuring, dense and utilitarian, etc. The variant should feel like the same designer added it, not a different one.
- **Constraints**: Technical requirements, viewport behaviour, conflicts with existing chrome.
- **Differentiation within scope**: Inside the brand's vocabulary, what's the sharpest version of *this specific change*? What makes it land?

**CRITICAL**: Intentionality, not intensity. Bold maximalism and refined minimalism both work — match whatever the page already does, and execute with precision. Confidence inside a constraint outperforms ambition that breaks it.

Then implement working code in `page/changes.js` that is:
- Production-grade and functional
- Cohesive with the surrounding page — it should look like part of the site, not an insert
- Meticulously refined in every detail

## Frontend Aesthetics Guidelines

These describe the *quality of execution* applied within the brand's existing vocabulary — they are not a free choice of aesthetic.

- **Typography**: Use the site's existing font stack. If the site has a distinctive display face, lean into it for headers. If it uses system fonts or a clean sans, that *is* the brand — don't import Playfair or Bricolage to "elevate". Vary weights, sizes, and tracking within the existing family.
- **Color**: Anchor to the brand palette pulled from `page/original.html`. Lead with dominant brand colors; one or two sharp accents *from the brand* outperform timid, evenly-distributed palettes. Don't invent new hues unless the brief explicitly asks for a break with brand.
- **Motion**: Reserved and high-impact. One well-orchestrated entrance, maybe one hover state, then quiet. Always wrap animations in `@media (prefers-reduced-motion: reduce)`.
- **Spatial composition**: Match the rhythm and density of the surrounding page. Don't introduce asymmetry, diagonal flow, or grid-breaking elements unless the site already uses them.
- **Detail**: Shadows, borders, subtle gradients within the brand palette. Skip novel textures, gradient meshes, or noise overlays unless the existing site already uses them.

**Generic AI output ≠ on-brand.** Generic comes from absence of intentional craft — timid palettes, default rounded corners, predictable centered cards, copy-paste component patterns. Matching the brand with intention and precision *avoids* generic by definition; it doesn't cause it.

**Variants should still feel different from each other.** The brand constrains the vocabulary (palette, typography, register, density) — not the message. Two banners on the same site should differ in *emphasis, hierarchy, copy, composition, which accent leads, where attention sits*. Same alphabet, different sentences. If every variant on a given brand looks identical, you're over-constraining; if they look like they're from different sites, you're under-constraining.

**Match implementation complexity to the brand's register.** Brands that are bold need elaborate, confident variant work. Brands that are refined need restraint, meticulous spacing, and typographic precision. Elegance comes from executing the brand's own vision well, not from importing a new one.

## Wiring runtime behaviour

Designs imply behaviour the brief won't always spell out. When inserting elements, wire whichever of these apply:
- **Space-claiming inserts** at the top or bottom of the viewport: offset `body` padding/margin so existing content isn't hidden underneath. Re-measure on `resize` if the inserted element's size varies between viewports.
- **Conflicts with existing fixed/sticky chrome** (cookie bars, sticky navs, floating elements): use `waitForElement` to adjust their `top`/`bottom`/`z-index` — CSS alone often can't reach them reliably.
- **Idempotency**: guard every insertion with `if (document.querySelector('.your-class')) return;` so the script is safe under SPA re-mounts or duplicate fires.
- **Z-index hygiene**: stacking above existing fixed page chrome often needs a very high value (e.g. `2147483000`).

## Stop conditions

- `page/changes.js` is written → reply with the single line `Done — refresh http://localhost:3000 to see it.` and stop.
- Do not write to any other file. Do not call `webapp-testing` or `chrome-devtools` MCP. Do not screenshot. Do not summarise.
