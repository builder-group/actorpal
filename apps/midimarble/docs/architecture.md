# Architecture

See also [conventions/ecs.md](./conventions/ecs.md) for the generic ECS and ECSify rules that guide this codebase.

## Purpose

This document explains Midimarble's specific architecture at a high level:

- what each domain owns
- why certain concerns are in ECS and others are not
- how authored state, live runtime state, and transient interaction state fit together
- how to extend the current foundation without creating hidden coupling

For the current project scope, one architecture document is enough. If a single domain becomes large enough that its section stops being easy to scan, that is the point to split it into domain-specific follow-up docs.

## Product Scope

The current foundation is optimized for:

- one marble
- editable straight tracks
- direct scene manipulation
- timeline playback over buffered simulation
- an ECS-first engine with clear domain ownership

The architecture should stay simple for that scope while leaving clean paths for more scene elements and editor tools later.

## Runtime Overview

The runtime is built from these engine plugins:

- `Core`
- `Physics`
- `Render`
- `Scene`
- `SceneManipulation`
- `Trajectory`

The editor layer also uses a React context:

- `TimelineCx`

That split is intentional. Timeline is editor presentation state over engine data, not an engine domain itself.

## State Layers

### Authored scene state

This is the editable scene document.

Current examples:

- `AuthoredTransformMixin`
- `SceneElementMixin`
- `LinearElementMixin`
- `StraightTrackMixin`

This state is what scene editing changes directly.

### Live runtime state

This is the state used by rendering and simulation.

Current examples:

- `PositionMixin`
- `RotationMixin`
- `ScaleMixin`
- rigid body and collider components
- Three.js mesh objects

For static scene elements, live transforms are derived from authored transforms.
For dynamic elements such as the marble, live state is driven by simulation.

### Transient interaction state

This exists only while the user is editing.

Current examples:

- selected entity
- drag mode
- pointer-down offsets
- manipulation handles

This state belongs to `SceneManipulation`, not to the scene document.

## Domain Ownership

### `Core`

Owns generic live runtime primitives:

- transform mixins used by render and physics
- general app helpers

`Core` should stay small and domain-neutral.

### `Scene`

Owns the authored scene document and scene-domain derivation.

Responsibilities:

- define scene element components
- seed the scene
- sync authored transforms into live transforms for static elements
- derive straight-track geometry and colliders from authored scene data

`Scene` is the source of truth for what the user has authored.

### `Physics`

Owns simulation and playback behavior.

Responsibilities:

- Rapier world lifecycle
- rigid body and collider creation
- stepping the live world
- maintaining buffered preload state
- checkpointing
- rebuilding simulation after authored scene edits

Important boundary:

- editor code does not write physics invalidation resources directly
- editor code calls explicit physics app extensions to signal authored scene mutation

### `Render`

Owns the viewport and ECS-to-Three sync.

Responsibilities:

- scene, camera, controls, and renderer lifecycle
- applying live ECS state to rendered objects

It should not own authored editing rules.

### `SceneManipulation`

Owns direct manipulation of editable scene elements.

Responsibilities:

- selection
- hit testing
- handle creation and positioning
- drag bookkeeping
- mutations to authored scene components during move and resize

Current abstraction level:

- generic for authored linear elements on the scene plane
- not yet a full universal editor tool framework

That is intentional. It stays simple while still being reusable beyond one hardcoded straight-track tool.

### `Trajectory`

Owns simulation-derived trajectory visualization.

Responsibilities:

- compute path previews from simulation state
- render them as overlays

This is derived output, not authored data.

### `TimelineCx`

Owns timeline presentation and extension at the editor layer.

Responsibilities:

- active timeline view
- pixels-per-second zoom
- contributor registration
- timeline view model assembly
- explicit subscriptions to watched engine resources and components

Why it is outside ECS:

- it is primarily UI composition state
- it consumes engine state but does not need engine systems
- React/context is the simpler ownership model

## Current Scene Model

### Straight tracks

Straight tracks are modeled as:

- scene identity and editability via `SceneElementMixin`
- authored placement via `AuthoredTransformMixin`
- generic linear authored behavior via `LinearElementMixin`
- track-specific profile data via `StraightTrackMixin`

This split lets the manipulation layer stay generic for linear elements while the scene layer owns track-specific mesh and collider derivation.

### Marble

The marble is currently a dynamic simulation entity.

It uses live transform state and physics-driven motion, not authored transform state.

That keeps the authored scene document separate from simulation output.

## Why Things Are Done This Way

### Why authored transforms are separate from live transforms

Because the document and the current simulation/render state are not the same thing.

Keeping them separate makes it clear:

- what the user authored
- what the world is currently doing
- what can safely be reset or rebuilt

### Why straight-track editing uses center plus length

The current manipulation model is based on:

- authored center position
- authored forward direction from rotation
- authored extent from `LinearElementMixin.length`

That matches the supported Marblie-like interaction well and keeps resizing behavior understandable.

### Why the timeline is not an engine plugin

Because the timeline is editor presentation state over transport and buffered simulation data.

Putting it in ECS would make the engine type surface larger without giving a clear runtime benefit.

## Extension Guidance

### Adding a new scene element

Ask:

1. What authored data belongs in `Scene`?
2. Does it share a generic manipulation capability with existing elements?
3. Which scene or runtime system derives its mesh, colliders, or simulation data?

If the element is editable, prefer composing it from existing generic capabilities before inventing a new one-off editor path.

### Adding a new manipulation mode

Ask:

1. Is the mode generic across element capabilities?
2. Is the state transient?
3. Does it edit authored scene data directly?

If yes, it probably belongs in `SceneManipulation`.

### Adding a new timeline layer

Add it as a timeline contributor in `TimelineCx`, not as an engine plugin, unless it genuinely needs its own runtime systems.

Declare:

- `watchResources`
- `watchComponents`

so the timeline stays explicitly reactive.

## Current Risks

The architecture is in good shape for the current scope.

The main remaining risks are not boundary problems, they are product-growth risks:

- adding new scene element types without preserving capability-based modeling
- pushing UI concerns back into ECS for convenience
- letting editor interaction mutate physics internals instead of using explicit boundaries

If those rules are kept, this foundation should remain easy to extend.
