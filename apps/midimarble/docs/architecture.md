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

The engine now uses seven plugins:

- `Core`
- `Midi`
- `Transport`
- `Physics`
- `Render`
- `Trajectory`
- `Scene`

Dependency graph:

- `Core` has no app-specific dependencies
- `Midi` depends on `Default` only
- `Transport` depends on `Midi`
- `Physics` depends on `Core`, `Midi`, and `Transport`
- `Render` depends on `Core`
- `Trajectory` depends on `Core`, `Physics`, and `Render`
- `Scene` depends on `Core`, `Physics`, `Render`, and `Trajectory`

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

Playback state now lives across `Midi`, `Transport`, and `Physics`.

That split is intentional:

- `Midi` owns the imported song and first selected track
- `Transport` owns play/pause and the current playhead tick
- `Physics` owns live steps, buffered steps, checkpoint restore, world replacement, and rebuild state
- the timeline UI reads all three, but still stays in React

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

### `Render`

Owns only rendering semantics.

Responsibilities:

- viewport lifecycle
- `MeshMixin`
- mounting Three objects
- syncing live transforms to Three objects
- disposing orphaned render objects

`Render` does not know scene semantics.

### `Trajectory`

Owns only trajectory visualization.

Responsibilities:

- `TrajectorySourceTag`
- trajectory buffers and line objects
- simulation-derived path rendering

`Trajectory` defines what a trajectory source is and queries only `TrajectorySourceTag`.

It does not need to know what a marble is.

Trajectory refresh should be keyed off ECSify resource/component change tracking, not a duplicated shadow sync resource.

For the current slice, trajectory still visualizes the current live simulation path only.
Note markers are the next slice, not part of the current engine state yet.

### `Scene`

`Scene` is the app-specific composition root.

Responsibilities:

- authored scene components
- initial scene seeding
- direct manipulation state and systems
- entity bundle factories
- authored-to-runtime sync for scene-authored track meshes and collider descriptors

`Scene` is allowed to attach mixins owned by other plugins when it creates entities:

- `MeshMixin`
- `RigidBodyMixin`
- `ColliderMixin`

It may also attach tags owned by extension plugins that this app wires in:

- `TrajectorySourceTag`

That is composition, not ownership leakage.

`Scene` does not define what those mixins mean. It only decides that a Midimarble entity uses them.

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
