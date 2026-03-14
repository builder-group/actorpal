# Midimarble UX

## Purpose

This document describes the intended Midimarble editor experience from the user's point of view.

It is not the low-level engine design.

It exists to answer:

- what the editor should feel like
- what the core authoring loop is
- how time, trajectory, and note placement should behave
- which elements are parametric and which are freeform

For engine ownership and plugin boundaries, see `architecture.md`.
For current naming and boundary choices, see `decisions.md`.

## Product Framing

Midimarble is a music-first marble editor.

The user is not drawing a static scene and then asking it to make sound later.
The user is building a marble run directly against musical time.

The core experience should feel like:

- import a song
- watch the marble path through time
- place note-driven platforms where notes happen
- shape the path
- see the future update immediately

The trajectory is not just debug visualization.
It is the main authoring surface.

## Current Implemented Slice

The current editor now supports:

- importing one MIDI file
- auto-selecting the first parsed track with notes
- a shared tick-first transport playhead
- simple built-in sound playback for the selected track
- a timeline whose length comes from the imported song
- tick navigation with reset, back one tick, play/pause, and forward one tick
- note markers rendered on the marble trajectory for the selected track
- clicking a note marker to pause if needed, seek, and select that note
- clicking a timeline note to select the same note and jump there
- a read-only inspector for the current selected note, straight track, or marble

This slice intentionally stops before note-bound platform creation.

## Core UX Model

### One shared playhead

The editor should have one shared source of truth for playback position.

Conceptually, that playhead represents:

- where the marble is in the run
- where the song is in musical time
- where the red timeline playhead is

The user should never feel like there is:

- a physics time
- a MIDI time
- a separate UI time

There is one playhead.

Internally that playhead may map between simulation step and MIDI tick, but the UX should present it as one coherent position.

That same playhead should also drive what the user hears.

### Trajectory as authoring UI

The trajectory should become the note-placement surface.

The line and note markers are not secondary overlays. They are how the user understands:

- where the marble came from
- where it is going next
- where a note will occur
- where a new note-bound platform can be added

### Parametric by default

When a platform is created from a note marker, it should be treated as part of the note chain by default.

That means:

- it belongs to a specific note or note moment
- it follows the updated future trajectory when upstream changes alter the marble path
- its authored adjustments, such as rotation, remain meaningful while its solved position may move

This is different from free scene elements.

Free elements are not bound to a note moment and should remain directly movable by the user.

## Main Authoring Loop

The intended workflow is:

1. The user imports a MIDI track.
2. The editor enters build mode for the first parsed track with notes.
3. The user drags the marble start position to define tick `0`.
4. The user advances through time either:
   - one tick at a time
   - or by pressing play
5. The editor shows note markers on the marble trajectory for the selected track.
6. The user clicks a note marker to select that musical moment and jump the playhead there.
7. In the next slice, that selected note becomes the place where a note-bound platform is created.
8. The user continues forward to the next note and repeats the process.

This loop should feel incremental and musical, not batch-generated.

The user should be able to build the run note by note.

## Timeline UX

The timeline should visualize the same playhead the 3D viewport uses.

Its job is to make time legible and controllable, not to become a second editor.

The timeline viewport itself should support:

- seeking from the ruler as well as the note body
- zooming in and out without changing the underlying playhead model
- expanding to the available panel width even when the song is short

### Timeline controls

The intended core controls are:

- reset to tick `0`
- back one tick
- play / pause
- forward one tick

Later, higher-level navigation can be added, such as:

- jump to previous note
- jump to next note
- jump to selected note

But the baseline editing flow should already work with the four core controls above.

### Timeline meaning

The red playhead indicates the current shared playback position.

The timeline should eventually make clear:

- past note moments
- current playhead position
- simulated future that is already known
- future that is not yet computed

The user should be able to trust that the timeline and the 3D note markers refer to the same moments.

Selecting a note from either surface should select the same note everywhere:

- click a timeline note: the 3D marker becomes selected
- click a 3D marker: the matching timeline note becomes selected
- the shared selection should still point at one note, not two parallel UI-local selections

The right sidebar should also follow that same current target:

- selected note
- selected straight track
- selected marble

## Trajectory And Marker UX

### Past and future

The trajectory should be split conceptually into:

- past
- future

The past should be shown completely for the currently known run.
It tells the user what has already been solved or traversed.

The future should be shown only as far as the engine has currently simulated ahead.
It should also never imply musical time beyond the imported song length.
That future is the actionable space where upcoming note markers can be clicked.

### Note markers

Note markers should show where the marble is expected to be when each note occurs.

Their job is to support authoring, not only display.

Marker interactions should evolve like this:

- current slice: click selects the note and seeks there
- next slice: click creates or selects the note-bound platform for that note
- selected: show that the note is the current editing target

The user should not need to mentally translate from a MIDI list into 3D space.
The marker is the bridge between time and geometry.

## Platform Editing UX

### Note-bound platforms

Platforms created from note markers should be note-bound by default.

That means:

- the note moment remains their anchor in the chain
- their solved world position may change when upstream path changes
- their user-authored properties should remain stable where possible

Example:

- the user places a platform at note 7
- then later rotates the platform at note 3
- the marble path after note 3 changes
- note 7's platform shifts to the new solved position on the updated path
- note 7's own rotation and other local authored settings remain intact unless the user changes them

This is the parametric behavior that makes Midimarble feel like a real build system rather than a loose physics toy.

### Free elements

The editor should also support elements that are not bound to note markers.

These are used for:

- visual composition
- optional path shaping outside note moments
- future decorative or auxiliary gameplay elements

Free elements should remain freely movable and should not be automatically repositioned by note-chain updates.

The UX needs to make this distinction legible:

- note-bound elements belong to the musical chain
- free elements belong to the scene

## Editing Upstream And Reflowing The Future

One of the most important UX goals is that the user can go back and improve earlier decisions without manually rebuilding everything later in the song.

Example:

- the user decides the first placed platform looks ugly
- they rotate it to improve the angle
- the marble path changes
- all later note-bound platform placements update to the new solved future path

This reflow is not a side effect. It is a core promise of the editor.

The user should come to expect:

- upstream changes reshape downstream note-bound placements
- the future updates immediately
- the timeline and note markers remain coherent after the change

## UX Principles

The editor should follow these principles:

### 1. One time model

There is one playhead, not competing clocks.

### 2. Trajectory is primary

The line and note markers are part of the editor, not debug leftovers.

### 3. Build incrementally

Users should be able to work one note at a time.

### 4. Parametric where it matters

Note-bound platforms should update with the chain.

### 5. Freeform where it matters

Not every scene element needs to belong to a note.

### 6. Immediate feedback

Dragging, rotating, stepping, and playing should make the future understandable right away.

## Immediate Next UX Milestones

The staged UX evolution should be:

1. Shared tick-first playhead with imported song length and first-track selection.
2. Note markers rendered on the trajectory for the selected track.
3. Clickable note markers on the trajectory.
4. Note-bound platform creation from markers.
5. Downstream reflow of later note-bound platforms after upstream edits.
6. Free non-note elements alongside the note chain.

This keeps the product moving toward the full editor experience without pretending the final interaction model is already complete.
