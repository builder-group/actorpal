# Architecture

## Purpose

This document is the Midimarble-specific source of truth for:

- plugin ownership
- plugin dependencies
- state layering
- where ECS stops and plain UI begins

For stable naming and boundary choices, see `decisions.md`.

The current architecture is intentionally optimized for the narrow prototype:

- one marble
- editable straight tracks
- direct manipulation
- physics-backed playback with a timeline UI

## Plugin Graph

The engine now uses eight plugins:

- `Core`
- `Midi`
- `Transport`
- `Audio`
- `Physics`
- `Render`
- `Trajectory`
- `Scene`

Dependency graph:

- `Core` has no app-specific dependencies
- `Midi` depends on `Default` only
- `Transport` depends on `Midi`
- `Audio` depends on `Midi` and `Transport`
- `Physics` depends on `Core`, `Midi`, and `Transport`
- `Render` depends on `Core` and `Physics`
- `Trajectory` depends on `Core`, `Midi`, `Transport`, `Audio`, `Physics`, and `Render`
- `Scene` depends on `Core`, `Midi`, `Physics`, `Render`, and `Trajectory`

This graph is intentionally one-way and acyclic.

`Scene` is the app-specific composition root for Midimarble entities.

`Physics`, `Render`, and `Trajectory` stay scene-agnostic. `Scene` is the only plugin allowed to know all of them.

The engine should prefer ECSify-native change tracking over ad-hoc diff caches:

- `Added(...)`
- `Changed(...)`
- `Removed(...)`
- `app.wasResourceAdded(...)`
- `app.wasResourceChanged(...)`

Manual signature maps or shadow sync resources are a last resort, not the default.

## What Lives Outside ECS

The timeline UI stays in React.

That is intentional:

- timeline controls are editor presentation
- the UI reads engine state and calls runtime methods
- the timeline does not need its own ECS plugin for the current scope
- a small React-side `TimelineCx` may own zoom, scroll, and viewport layout only

Playback state now lives across `Midi`, `Transport`, `Audio`, and `Physics`.

That split is intentional:

- `Midi` owns the imported song and first selected track
- `Transport` owns play/pause and the current playhead tick
- `Audio` owns sound output for the selected track
- `Physics` owns live steps, buffered steps, checkpoint restore, world replacement, and rebuild state
- the timeline UI reads the relevant state but still stays in React

Midimarble uses this generic schedule:

- `First`
- `PreUpdate`
- `Update`
- `PostUpdate`
- `Last`
- `Flush`

`Flush` exists specifically so ECSify change tracking stays visible through late-frame systems.

## State Layers

### Authored state

This is the scene document.

Current examples:

- `AuthoredTransformMixin`
- `StraightTrackMixin`
- `LinearElementMixin`

Authored state is what editing mutates.

### Live runtime state

This is the state used by simulation and rendering.

Current examples:

- `PositionMixin`
- `RotationMixin`
- `ScaleMixin`
- `RigidBodyMixin`
- `ColliderMixin`
- `MeshMixin`
- Rapier worlds and checkpoint data

For static scene entities, live transforms are derived from authored transforms.

For dynamic entities like the marble, live transforms are driven by physics.

### Transient interaction state

This exists only while editing.

Current examples:

- selected entity id
- drag mode
- drag offsets
- manipulation handles

This state lives in `Scene` because the current editor interaction is entirely scene-specific.
Note selection remains in `Midi`, and `Scene` clears its own entity selection whenever note selection becomes active.

## Plugin Ownership

### `Core`

Owns only shared runtime primitives:

- `PositionMixin`
- `RotationMixin`
- `ScaleMixin`
- `spawnBundle()`

`Core` should stay small and domain-neutral.

### `Physics`

Owns only physics semantics and physics-specific runtime control.

Responsibilities:

- Rapier lifecycle
- rigid body and collider components
- live world stepping
- checkpoint and preload buffering
- following the transport tick playhead by mapping ticks to steps
- generic simulation invalidation and resync

Public physics sync contract:

- `markSimulationDirty()`
- `requestSimulationSync()`

Important boundary:

- `Physics` does not know scene editing
- callers only tell physics that simulation is stale or should rebuild

### `Midi`

Owns imported song data for the editor.

Responsibilities:

- `midiSong`
- `selectedTrackId`
- `selectedNoteId`
- MIDI import and parse errors
- first-track-only selection for the current slice

Important boundary:

- `Midi` does not own playback
- it is the source of song timing, not the source of the playhead

### `Transport`

Owns the shared playback playhead.

Responsibilities:

- `transport`
- play/pause
- tick-based seek/reset controls
- advancing the tick playhead from song BPM and ticks-per-beat

Important boundary:

- `Transport` does not own buffering or world restore
- it follows `Midi` for song timing, and `Physics` follows it for simulation state

### `Audio`

Owns only sound output.

Responsibilities:

- `audioState`
- `audioConfig`
- simple built-in synthesis for the selected track
- note previews on step controls and note clicks
- transport-driven note playback while running

Important boundary:

- `Audio` does not own playhead state
- it follows `Midi` and `Transport`
- it intentionally does not implement a heavy scheduler or SoundFont pipeline yet

### `Render`

Owns only rendering semantics.

Responsibilities:

- viewport lifecycle
- `MeshMixin`
- mounting Three objects
- syncing live transforms to Three objects
- preview camera state and follow-camera behavior
- disposing orphaned render objects

`Render` owns preview as viewport state, not authored scene state.

`Render` does not know scene semantics.

### `Trajectory`

Owns only trajectory visualization.

Responsibilities:

- `TrajectorySourceTag`
- past and future line objects
- note marker objects and picking
- `trajectoryProjection` as the shared note-anchor seam
- simulation-derived path rendering
- note selection and seek interactions routed through shared engine state
- clipping the visible future to the imported song horizon

`Trajectory` defines what a trajectory source is and queries only `TrajectorySourceTag`.

It does not need to know what a marble is.

Trajectory refresh should be keyed off ECSify resource/component change tracking, not a duplicated shadow sync resource.

For the current slice, trajectory is now the first real authoring surface:

- it shows the full solved past
- it shows the currently buffered future
- it renders selected-track MIDI note markers on that path
- clicking a marker pauses if needed, seeks the shared playhead, and selects the note
- timeline note selection and trajectory marker selection meet at shared `selectedNoteId`
- note anchors are exposed through `trajectoryProjection`, not through Three marker objects

### `Scene`

`Scene` is the app-specific composition root.

Responsibilities:

- authored scene components
- initial scene seeding
- direct manipulation state and systems
- entity bundle factories
- authored-to-runtime sync for scene-authored track meshes and collider descriptors
- note-bound platform creation and runtime sync

`Scene` is allowed to attach mixins owned by other plugins when it creates entities:

- `MeshMixin`
- `RigidBodyMixin`
- `ColliderMixin`

It may also attach tags owned by extension plugins that this app wires in:

- `TrajectorySourceTag`

That is composition, not ownership leakage.

`Scene` does not define what those mixins mean. It only decides that a Midimarble entity uses them.

`Scene` also owns note-bound world entities that reference MIDI note ids.
The note data itself still stays in `Midi`.

## Current Entity Model

### Straight track

A straight track is composed from:

- authored placement via `AuthoredTransformMixin`
- authored track shape via `StraightTrackMixin`
- generic linear editing data via `LinearElementMixin`
- render data via `MeshMixin`
- physics setup via `RigidBodyMixin` and `ColliderMixin`

The track mesh and collider descriptors are updated inside `Scene` when authored track data changes.

That sync is driven by ECSify `Added(...)` and `Changed(...)` queries rather than plugin-local signature caches.

### Marble

The marble is composed from:

- app identity via `MarbleTag`
- trajectory source capability via `TrajectorySourceTag`
- render data via `MeshMixin`
- physics setup via `RigidBodyMixin` and `ColliderMixin`

The marble is not modeled as authored transform state after spawn. Its live position comes from physics.

### Note platform

The first note-bound platform is composed from:

- note identity via `NoteBindingMixin`
- authored local shape via `NotePlatformMixin`
- live transform via `PositionMixin` and `RotationMixin`
- render data via `MeshMixin`
- physics setup via `RigidBodyMixin` and `ColliderMixin`

It is intentionally not a `LinearElementMixin` and not a free-move scene element in this slice.

Its world placement is derived from `trajectoryProjection`:

- `Midi` owns the note
- `Trajectory` solves and exposes the note anchor
- `Scene` owns the entity that binds to that note id

If the anchor is unresolved, the platform hides its mesh and clears its colliders.
If upstream path changes move the anchor, the platform reflows to the new solved position without losing its authored local properties.

### Pegboard

The pegboard is currently simple environment geometry with authored placement and a render object.

## Simulation Sync Model

When authored scene data changes:

1. `Scene` mutates authored components.
2. `Scene` calls `markSimulationDirty()`.
3. `Physics` treats the buffered simulation as invalid from step `0`.
4. The UI shows rebuild progress from `0` up to the current playhead.
5. On commit, `Scene` calls `requestSimulationSync()`.
6. `Physics` rebuilds exactly to the current transport playhead and swaps the rebuilt world in.

This is intentionally honest.

The past is not shown as still-valid after an authored edit, because it is not guaranteed to be valid.

## Why This Shape

This architecture is deliberately simple for the prototype:

- one app-specific composition root instead of extra scene sub-plugins
- owner plugins stay pure
- timeline UI stays outside ECS
- state layers remain explicit
- plugin dependencies stay one-way

The goal is not maximal abstraction.

The goal is that another engineer can answer these questions quickly:

1. Where is the authored scene document?
2. Where does physics invalidation live?
3. Who creates a straight track entity?
4. Who owns the meaning of each mixin?

If those answers stop being obvious, the architecture needs another pass.
