# Architecture

## Purpose

This document is the Midimarble-specific source of truth for:

- plugin ownership
- plugin dependencies
- state layering
- where ECS stops and plain UI begins

The current architecture is intentionally optimized for the narrow prototype:

- one marble
- editable straight tracks
- direct manipulation
- physics-backed playback with a timeline UI

## Plugin Graph

The engine now uses five plugins:

- `Core`
- `Physics`
- `Render`
- `Trajectory`
- `Scene`

Dependency graph:

- `Core` has no app-specific dependencies
- `Physics` depends on `Core`
- `Render` depends on `Core`
- `Trajectory` depends on `Core`, `Physics`, and `Render`
- `Scene` depends on `Core`, `Physics`, `Render`, and `Trajectory`

This graph is intentionally one-way and acyclic.

`Scene` is the app-specific composition root for Midimarble entities.

`Physics`, `Render`, and `Trajectory` stay scene-agnostic. `Scene` is the only plugin allowed to know all of them.

## What Lives Outside ECS

The timeline UI stays in React.

That is intentional:

- timeline controls are editor presentation
- the UI reads engine state and calls runtime methods
- the timeline does not need its own ECS plugin for the current scope

Simulation transport and playhead state remain inside `Physics`, because they directly control physics stepping, seeking, checkpoint restore, and preload.

## State Layers

### Authored state

This is the scene document.

Current examples:

- `SceneElementMixin`
- `AuthoredTransformMixin`
- `StraightTrackMixin`
- `LinearElementMixin`
- `PegboardMixin`

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

Owns only physics semantics and simulation runtime control.

Responsibilities:

- Rapier lifecycle
- rigid body and collider components
- live world stepping
- checkpoint and preload buffering
- seek/reset support
- generic simulation invalidation and resync

Public physics sync contract:

- `markSimulationDirty()`
- `requestSimulationSync()`

Important boundary:

- `Physics` does not know scene editing
- callers only tell physics that simulation is stale or should rebuild

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

It may also attach tags owned by optional extension plugins:

- `TrajectorySourceTag`

That is composition, not ownership leakage.

`Scene` does not define what those mixins mean. It only decides that a Midimarble entity uses them.

## Current Entity Model

### Straight track

A straight track is composed from:

- scene identity and editability via `SceneElementMixin`
- authored placement via `AuthoredTransformMixin`
- authored track shape via `StraightTrackMixin`
- generic linear editing data via `LinearElementMixin`
- render data via `MeshMixin`
- physics setup via `RigidBodyMixin` and `ColliderMixin`

The track mesh and collider descriptors are updated inside `Scene` when authored track data changes.

### Marble

The marble is composed from:

- scene identity via `SceneElementMixin`
- marble config via `MarbleMixin`
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
6. `Physics` rebuilds exactly to the current playhead and swaps the rebuilt world in.

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
