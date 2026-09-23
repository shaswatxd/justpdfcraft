# Coding & Design Conventions

**Analysis Date:** 2026-09-23
**Project:** JustPDFCraft

## Design System: Pure AMOLED Black

The application adheres to an uncompromising, high-contrast **AMOLED True Pitch Black** aesthetic (`#000000`):

1. **Surfaces & Backgrounds:**
   - Base canvas and background: `#000000` (`bg-black`).
   - Elevated cards & modals: `#050505` to `#080808` (`bg-zinc-950/70`, `border-zinc-800`).
   - Hover states: `#141416` (`hover:bg-zinc-900/60`).
   - Never use generic washed-out gray gradients (`from-slate-900 to-slate-800`).

2. **Accents & Categories:**
   - **PDF Tools:** Electric Blue (`text-blue-400`, `bg-blue-600`).
   - **Image Tools:** Mint / Emerald (`text-emerald-400`, `bg-emerald-600`).
   - **Student Tools:** Amber Gold (`text-amber-400`, `bg-amber-600`).
   - **Exam Suite:** Amber / Cyan badges with subtle glow.

3. **Text Layer Selection Contract:**
   - All selectable text layers (`[data-text-layer]`) MUST have `color: transparent !important` and `-webkit-text-fill-color: transparent !important` even when selected.
   - Text selection highlight MUST be translucent blue (`rgba(59, 130, 246, 0.38)`) so underlying canvas vector text shines through with zero ghosting.

## TypeScript & Coding Standards

1. **Strict Type Safety:**
   - `noUnusedLocals: true`, `noUnusedParameters: true`, `strict: true`.
   - Never use unchecked `any` casts when a typed interface exists in `@core/pdf/engine.interface.ts`.
2. **State Management Discipline:**
   - All shared state is organized in Zustand stores (`src/stores/`).
   - Component state is reserved for transient UI (drag states, local slider values).
3. **Memory Management:**
   - Always revoke `URL.createObjectURL` using `if (url.startsWith('blob:')) URL.revokeObjectURL(url)`.
   - Canvas elements in tabs must bind preview image data via base64 `dataUrl` to prevent black blank screens on unmount/remount.
   - Offscreen pages in continuous scroll must unmount via `IntersectionObserver`.
