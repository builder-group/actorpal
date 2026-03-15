# ECS And ECSify Conventions

See also [../architecture.md](../architecture.md) for the Midimarble-specific domain map and plugin ownership.

Primary ECSify reference: [../../../../../community/packages/ecsify/README.md](../../../../../community/packages/ecsify/README.md).

## Purpose

This document captures generic rules for building with ECS and ECSify.

It should stay reusable across projects. Do not put app-specific plugin names, scene element names, or product behavior here unless they illustrate a general rule.

## Core ECS Rules

### Components store data, not behavior

Components should describe state. They should not hide domain behavior behind methods or class instances.

Good:

- transforms
- authored shape data
- rigid body descriptors
- selection state

Bad:

- components that execute behavior
- components that own hidden side effects
- components that mix unrelated concerns because they are convenient today

Zero-data components should use a marker-style name such as `*Marker` or `*Tag`.

Reserve `*Mixin` for components that actually carry state.

### Systems own behavior

Systems should:

- read components and resources
- compute derived results
- write updated components or resources

Prefer small systems with clear ownership over large systems that mix document edits, rendering, simulation, and UI policy.

### Model by capability

Do not model everything as one-off entity types first.

Instead, ask:

1. What capability is generic?
2. What data is element-specific?
3. What system derives runtime behavior from that data?

This usually leads to cleaner composition and better extension paths.

## State Layers

Every new piece of state should fit one layer clearly.

### Authored state

This is the document or user-authored source of truth.

Examples:

- authored transforms
- scene element parameters
- editor-created notes or markers

Rules:

- keep it explicit
- keep it serializable
- do not let simulation overwrite it

### Live runtime state

This is the current state used for rendering, physics, playback, or other runtime computation.

Examples:

- live transforms
- buffered simulation state
- render objects

Rules:

- it may be derived from authored state
- it may be driven by simulation
- do not confuse it with the document

### Transient interaction state

This exists only while the user is interacting.

Examples:

- active drag mode
- pointer-down offsets
- temporary handles
- hover state

Rules:

- keep it near the interaction owner
- do not persist it as authored state
- do not let it leak into unrelated domains

## ECSify Conventions

### Prefer the app approach by default

ECSify's app approach is the default for most product code because it gives:

- plugin boundaries
- typed components and resources
- explicit systems
- clearer ownership

Use the raw approach only when performance pressure is real and measured.

### Use plugins for runtime domains

A plugin is a good fit when a concern owns:

- its own components or resources
- systems with runtime behavior
- app extensions that expose a domain boundary

Good examples:

- scene derivation
- simulation
- rendering
- editor interaction

Do not turn `Core` into a general utility dump.

- shared ECS primitives or app-level scheduling types belong in `Core` or shared engine types
- plain math or string helpers belong in the nearest plugin `lib/` or a plain engine utility module

Bad examples:

- a plugin that mostly stores React view state
- a plugin that exists only to avoid passing props

### Use `updateComponent` and `updateResource` for tracked changes

When working through the app API, prefer `app.updateComponent()` and `app.updateResource()` over direct mutation so change tracking stays explicit.

If direct mutation is necessary in a hot path, mark the change explicitly with ECSify's change-tracking API.

Before inventing local signature maps or shadow sync resources, check whether ECSify already gives you the signal you need:

- `Added(...)`
- `Changed(...)`
- `Removed(...)`
- `app.wasResourceAdded(...)`
- `app.wasResourceChanged(...)`

Prefer those first. Add manual caches only when there is a measured need that ECSify's built-in change tracking does not cover cleanly.

### Keep resources intentional

Resources are for global or singleton state, not a place to dump anything that does not fit.

Good resource candidates:

- config
- simulation transport
- registries
- UI context state that is truly singleton inside a domain

Bad resource candidates:

- per-entity state that belongs in components
- hidden cross-domain coordination that should be an app extension or explicit system boundary

### Query for the data you need

Prefer narrow queries over broad scans.

Ask for:

- the specific components a system actually needs
- the narrowest useful filter

This keeps system intent obvious and reduces accidental coupling.

## Plugin Boundary Rules

Before creating a plugin, ask:

1. Does this concern own runtime state or systems?
2. Can it be understood in isolation?
3. Would another project plausibly reuse the same boundary?
4. Is it better modeled as UI/context instead?

If the concern is mostly presentation state, React/context is often the better boundary.

### Keep plugin ownership separate from composition

A plugin should own the meaning and behavior of its own mixins and resources.

That does not mean the same plugin must be the one that initially attaches those mixins to entities.

An app-specific composition root may assemble entities from multiple domains:

- scene-authored mixins
- render mixins
- physics mixins
- debug or derived capability markers

That is composition, not ownership leakage.

### Prefer one app-specific composition root over speculative sub-plugins

For a narrow prototype, default to fewer plugin boundaries.

If one top-level app plugin can honestly own:

- authored state
- transient interaction state
- entity seeding
- entity composition

then keep it together until reuse pressure is real.

Do not create extra plugins only because the split feels architecturally neat.

### Keep plugin dependencies acyclic

Dependencies should flow from generic domains toward app-specific domains.

Good pattern:

- shared primitives at the bottom
- reusable owner plugins in the middle
- one app-specific composition root at the top

Bad pattern:

- cycles between scene, physics, render, and editor concerns
- plugins that need each other to explain what they mean

If two plugins start depending on each other, the boundary is usually wrong.

## Plugin File Layout

Keep plugin structure predictable.

Default shape:

- `*-plugin.ts` for plugin declaration and setup
- `systems.ts` for actual ECS systems only
- `types.ts` for public plugin types
- `lib/` for support logic used by systems or plugin setup

Rules:

- do not hide non-system helpers inside `systems.ts`
- move domain actions, math helpers, signatures, and setup utilities into `lib/`
- `systems.ts` should contain system exports only; even private helper functions should move to `lib/` once they stop being trivial
- if a plugin grows many systems, split `systems.ts` into a `systems/` folder with one file per domain or system group
- prefer naming helper files after the domain they support or the specific action they implement

## System Set Guidance

`ecsify` itself only needs this lean default schedule:

- `First`
- `Update`
- `Last`
- `Flush`

An app may extend that with additional generic phases when it has a real need.

For Midimarble, prefer a small generic schedule over domain-specific set names:

- `First`
- `PreUpdate`
- `Update`
- `PostUpdate`
- `Last`
- `Flush`

Rules:

- change-tracking consumers must run before `Flush`
- do not assume `Last` is safe for `Added(...)` or `Changed(...)` unless `Flush` is a separate final phase
- reserve domain-specific set names such as `Render` only when a truly reusable engine-wide pipeline exists

## UI Versus ECS

Put a concern in UI/context when it is mostly:

- layout state
- selected tab or view
- zoom or panel state
- presentation-layer composition

Put a concern in ECS when it is mostly:

- simulation
- scene document derivation
- render sync
- editor interaction with world entities

UI can consume ECS state freely. That does not mean UI state should move into ECS.

## Interaction Modeling Rules

For editor interactions:

- store authored edits in authored components
- store drag bookkeeping in transient interaction state
- preserve pointer continuity
- avoid jumps on pointer down
- make handle and tool config explicit

If a behavior is generic across multiple element types, model that capability generically instead of hardcoding one element type into the interaction layer.

Even when authored and transient interaction state live under the same top-level plugin, keep them clearly separated in names, files, and resources.

## Testing Rules

Test the seams where regressions are expensive.

Prefer extracting pure helpers for:

- interaction math
- view model assembly
- dependency collection
- domain derivation

Then test those helpers directly instead of standing up the whole runtime unless integration coverage is specifically needed.

## Extension Checklist

Before shipping a new ECS feature, answer:

1. Is this authored, live, or transient state?
2. Which domain owns it?
3. Does it need ECS, or would UI/context be simpler?
4. Are change-tracked updates explicit?
5. Can another engineer understand the ownership without knowing the implementation history?

If ownership is unclear, the design usually needs another pass.
