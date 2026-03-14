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
- `tick` = the current concrete unit in the shared transport slice
- `step` = the physics-facing derived unit used by simulation

So today the state is:

- `transport.playheadTick`

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

## Decision: Current Transport Slice Is Tick-First

The current implementation uses MIDI ticks as the concrete playhead unit.

That means:

- timeline controls are tick-based today
- the timeline UI still displays `Step` and `Preloaded` as physics debugging state
- `Physics` derives step targets from the transport tick playhead

This is the first real cross-domain transport slice, not a placeholder.

## Decision: Step Is Derived From Tick

The current time model is:

- `Transport` owns `playheadTick`
- `Physics` derives `liveStep` and `bufferedStep` from that tick-based playhead

The conversion is deterministic for the currently loaded song:

- `ticksPerSecond = (ticksPerBeat * bpm) / 60`
- `step = floor(seconds / fixedTimeStepSeconds)`

That means tick and step are related, but not identical.

## Decision: First MIDI Slice Is First-Track-Only

The current engine MIDI slice selects the first parsed track with notes.

That means:

- there is no multi-track UI yet
- there is no track switching UI yet
- the selected track is established at import time

This is intentional scope control for the prototype.

## Decision: Timeline Length Comes From The Imported Song

Once a MIDI file is loaded:

- the timeline width comes from `midiSong.totalTicks`
- beat markers come from `midiSong.ticksPerBeat`
- the red playhead is positioned from `transport.playheadTick`

The preload region is still physics-derived and remains a separate concept from song length.

## Decision: One Shared Playhead In The UX

Even though the engine now exposes both transport ticks and physics steps, the intended UX is still one shared playhead.

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

The timeline may use a small React-side `TimelineCx` for viewport behavior such as:

- zoom
- scroll position
- container width
- tick-to-pixel conversion

That context is view-state only.
It must not become a second owner of transport, MIDI, or physics domain state.

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
