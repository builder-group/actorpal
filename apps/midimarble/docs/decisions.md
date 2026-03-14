# Decisions

## Purpose

This document records the current Midimarble architecture and product decisions that should stay stable across implementation steps.

Use it for naming, ownership, and UX-policy decisions that would otherwise get re-litigated in code review.

For system structure and plugin ownership details, see `architecture.md`.
For the broader target editor experience, see `ux.md`.

## Decision: Shared Playback Domain Is Named `Transport`

The shared playback/playhead owner is named `Transport`.

Why:

- it describes shared playback intent, not UI
- it can later serve both physics and MIDI
- it avoids pulling playhead ownership back into `Physics`

Rejected names:

- `Timeline`
  - sounds like UI/editor presentation
- `Simulation`
  - sounds physics-owned
- `Frame`
  - too ambiguous with render frames and video frames

## Decision: Use `playhead` For The Generic Concept

Use this vocabulary consistently:

- `playhead` = the generic current-position concept
- `step` = the current concrete unit in the implemented transport slice
- `tick` = the future MIDI-facing unit once MIDI is integrated

So today the state is:

- `transport.playheadStep`

Not:

- `currentFrame`
- `timelineFrame`
- `simulationFrame`

## Decision: `Physics` Follows `Transport`

The dependency direction is:

- `Transport` is generic
- `Physics` depends on `Transport`

Not the other way around.

Why:

- `Transport` should remain reusable as the shared playback/playhead domain
- `Physics` still owns physics-specific buffering, restore, preload, and rebuild behavior
- reversing the dependency would turn `Transport` into a physics playback wrapper

## Decision: Buffering Stays In `Physics`

The following remain physics-owned:

- `bufferedStep`
- checkpoint store
- preload world
- world restore
- simulation rebuild and sync

Why:

- these are still Rapier and simulation invariants
- they are not generic transport concerns

## Decision: Current Transport Slice Is Step-Based

The current implementation uses simulation steps as the concrete playhead unit.

That means:

- timeline controls are step-based today
- the timeline UI can display `Step` and `Preloaded`
- the transport plugin does not model MIDI ticks yet

This is an intentional staging decision, not the final product model.

## Decision: One Shared Playhead In The UX

Even though the current implementation is step-based, the intended UX is still one shared playhead.

The user should experience:

- one current position in time
- one red playhead
- one trajectory timeline relationship

Later, physics step and MIDI tick may both exist internally, but the UX should still feel like one coherent time model.

## Decision: The Timeline Remains React UI

The timeline stays outside ECS for now.

Why:

- it is presentation and interaction UI
- it reads engine state and calls runtime actions
- it does not yet need its own plugin boundary

## Decision: Trajectory Is A Real Authoring Surface

Trajectory is not just debug output.

It is intended to become:

- the note marker surface
- the place where users see upcoming musical events
- the primary 3D mechanism for placing note-bound platforms

This decision should guide future trajectory and MIDI work.

## Decision: Note-Bound Elements Are Parametric By Default

Platforms created from note moments should be bound to that note chain by default.

That means:

- upstream path changes can reposition them
- their own authored properties, such as rotation, should remain stable where possible

Free elements are a separate category and should remain freely movable.
