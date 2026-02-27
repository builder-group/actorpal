# MidiMarble - Project Spec

> Upload a MIDI file. Build a marble run that plays the music. One bounce at a time.

**Domain:** midimarble.com
**Stack:** ecsify, Three.js, Rapier 3D, React, TypeScript, Vite, @tonejs/midi, Tone.js

## Concept

A browser-based tool where users turn MIDI files into 3D marble runs. The marble falls through a scene, bouncing off platforms that the user places. Each platform collision triggers a note from the MIDI file. The physics engine pre-computes the marble's trajectory, showing the user exactly where each note will occur. The user clicks to place platforms, rotates them to shape the path, and watches the whole thing play back as a synchronized music visualizer.

It's not auto-generated. It's not fully manual either. The physics guides you -- you make the creative decisions.

## How It Works

### Step 1: Upload

User drops a MIDI file. The app parses it and extracts a list of note events: pitch, time, velocity. For v1, a single track is selected. The user picks an instrument/synth sound. Then enters Build Mode.

### Step 2: Build (The Core Loop)

The marble starts at a position the user can drag. The app simulates the marble falling under gravity and draws:

- A **blue line** showing the marble's predicted trajectory
- **Yellow dots** along the trajectory at the exact positions where each MIDI note occurs in time

Without any platforms, this is a straight drop accelerating downward -- yellow dots getting further apart as the marble speeds up.

```
    O   <- marble (draggable start position)
    |
    |   <- blue trajectory line
    |
    o   <- note 1: C4 at t=0.4s
    |
    |
     o  <- note 2: E4 at t=0.9s
    |
    |
    o   <- note 3: G4 at t=1.3s
    |
```

**The user clicks a yellow dot.** A platform is placed at that position. The app re-simulates from the platform: marble hits it, bounces, new trajectory is computed. The blue line and all downstream yellow dots update instantly to reflect the new path.

```
    O
    |
    |
    ===\    <- platform placed at note 1
        \
         \  <- new trajectory after bounce
          \
          o <- note 2 repositioned on new path
          |
          o <- note 3 repositioned
```

**The user can rotate the platform.** The downstream path and dots update in real-time as they drag. Steeper angle? Marble shoots sideways. Flatter? Marble drops more vertically. The user shapes the run by shaping each bounce.

**Repeat** for each note. Click dot, place platform, adjust angle, see the path update, move to the next dot.

The marble can go in any direction -- down, sideways, even upward with steep bounce angles. The user decides.

### Step 3: Play

Hit play. The marble drops. Physics runs in real-time. Each platform collision triggers the corresponding MIDI note through the selected synth. The user watches their creation play the music.

Controls: play, pause, reset (marble returns to start).

## Trajectory & Pre-computation

The trajectory system is the backbone. Rapier is used for both build preview and playback -- one physics model, guaranteed consistency, no drift between what you see and what plays.

### How It Works

A separate "preview world" in Rapier simulates the marble's path. This runs ahead of real-time -- stepping thousands of physics ticks instantly to compute where the marble will be at each note's timestamp.

1. **No platforms placed:** Create a preview world with just the marble and gravity. Step it forward, recording the marble's position at each MIDI note's timestamp. Those positions become yellow dots. It's a straight accelerating drop.

2. **Platform placed at dot N:** Add platform N's collider to the preview world. Re-simulate from the start (or from the last placed platform -- Rapier is deterministic so we can snapshot and restore state). The marble hits the platform, bounces. Continue stepping, record positions at remaining note timestamps. Update all downstream dots.

3. **Platform N edited:** Re-simulate from platform N onward only. Restore the snapshot from just before platform N, apply the new rotation, step forward. Cascade through all downstream platforms.

### Performance

Rapier simulating a single marble through ~200 platforms is fast -- milliseconds. But during continuous drag rotation (60 re-simulations per second), long songs could get heavy.

**Mitigation during drag:** Only re-simulate the next 5-10 dots (the visible ones). Full cascade on mouse release. This keeps drag interaction smooth regardless of song length.

### Consistency Guarantee

**The marble cannot miss.** Build preview and playback use the same Rapier engine, same timestep, same world setup. What you see in build mode is exactly what plays back. One physics model, zero drift. This also means V2 features (curved platforms, bumpers, decorative elements) work automatically -- Rapier handles any collider shape.

## UI

The user is dropped directly into the 3D world. No landing page, no app chrome. The scene IS the interface -- like a 3D editor where the viewport dominates.

### Layout

```
+-------------------------------------------------------+--------+
|                                                        |        |
|                                                        | Props  |
|                                                        | Panel  |
|                   3D Viewport                          |        |
|                                                        |--------|
|            Marble, platforms, trajectory                |        |
|            rendered here                                | Plat-  |
|                                                        | forms  |
|            Full orbit camera controls                  |        |
|                                                        |        |
+--------------------------------------------------------+--------+
| [>] ====O===================================  0:04/1:23         |
|     |o  o   oo  o  o   o  oo o  o|o   o  o|   o  oo  o          |
|     placed (green)     ↑         unplaced (yellow)              |
|                     current                                     |
+-----------------------------------------------------------------+
```

### 3D Viewport (Full Screen)

- Takes up the entire screen minus the right panel and bottom bar
- Immersive -- user feels like they're IN the marble run
- Orbit controls: rotate, zoom, pan the camera freely
- Click interaction: select dots, select platforms
- Drag interaction: reposition marble start point

### Right Panel (Figma-style)

Context-sensitive. Shows different content based on what's selected:

**Nothing selected:**

- Platform type picker (straight for v1, more types later)
- Song info (name, BPM, note count, duration)
- Settings (dot visibility count, sound instrument)

**Platform selected:**

- Rotation controls (x, y, z)
- Note info: pitch (C4), time (0.4s), velocity (0.8)
- Delete button

**Yellow dot hovered/selected:**

- Note info preview
- "Place Platform" action

### Bottom Timeline Bar

This is both the MIDI visualizer AND the parametric history.

Every note is a tick mark on the timeline. The tick's state tells the full story:

- **Yellow tick** = unplaced note (dot visible in 3D, waiting for platform)
- **Green tick** = placed platform (locked in, part of the chain)
- **Playhead** = current position during playback

**Clicking a tick** jumps the camera to that note's 3D position. If it's a green (placed) tick, the platform is selected and editable. Editing it re-computes everything downstream -- all later platforms shift to where the new trajectory says the marble will be.

This IS the Fusion 360 timeline. Each green tick is an "operation." The chain of operations is the marble's path. Go back, tweak platform 3, and platforms 4-N reposition automatically. No separate action history needed -- the music itself is the history.

## Parametric Chain

Every platform depends on the ones before it. This dependency chain works like parametric modeling:

```
marble start pos
  └─> platform 1 (position computed from marble drop)
        └─> platform 2 (position computed from platform 1 bounce)
              └─> platform 3 (position computed from platform 2 bounce)
                    └─> ...
```

**Editing platform 2's rotation:**

1. Platform 2 stays in place but its bounce angle changes
2. The trajectory after platform 2 changes
3. Platform 3's position moves to where the new trajectory intersects the note's timestamp
4. Platform 3's bounce angle is preserved, but from a new position
5. Platform 4 repositions based on platform 3's new bounce
6. Cascade continues through all remaining platforms

**This happens live.** Drag a rotation slider, watch every downstream platform slide along the updated trajectory in real-time.

**Edge case -- platform goes off-screen or into impossible position:** The dot turns red. User needs to adjust upstream platforms to fix the chain. This is the creative puzzle.

## Visual Language

| Element             | Appearance                                          | Interaction                              |
| ------------------- | --------------------------------------------------- | ---------------------------------------- |
| **Marble**          | Red sphere at start position                        | Draggable to reposition start            |
| **Trajectory line** | Blue, solid between placed platforms, dashed beyond | Visual only                              |
| **Unplaced dot**    | Yellow, gently pulsing                              | Click to place platform                  |
| **Placed dot**      | Green, solid                                        | Click to select/edit platform            |
| **Problem dot**     | Red                                                 | Trajectory doesn't reach -- fix upstream |
| **Platform**        | Track piece at dot position                         | Rotate/drag, path re-computes live       |
| **Dot hover**       | Note name, time, velocity                           | Tooltip                                  |

Dot size reflects velocity -- louder notes get bigger dots.

Number of visible upcoming dots is user-configurable (default 5-10).

## Sound

Each platform collision triggers a synthesized note matching the MIDI data:

- **Pitch:** From the MIDI note number (C4, E4, etc.)
- **Velocity:** Maps to volume
- **Instrument:** User-selected synth from Tone.js (piano, marimba, xylophone, etc.)
- **Timing:** Determined by physics -- the collision IS the trigger

---

## Decorative Elements (Post-V1)

Between two note-dots, the path is "dead space." Users can click the trajectory line to place non-musical elements: funnels, rings, tubes, windmills. These add visual interest without triggering notes.

**V1:** Not included.
**V2 Option A (simple):** Visual only -- marble phases through them.
**V2 Option B (full):** Affect physics. Downstream dots reposition to account for altered travel time.

## Architecture

### ECS Core (ecsify) + React UI Shell

The app is an ecsify ECS with a React shell for the 2D UI. The ECS owns all game state and logic. React reads from the ECS and dispatches actions to it.

**Why ECS:** This is an editor, not a game. The same reasons ECS worked for the web editor apply here -- modular plugins, build step by step, extend easily. Adding a new platform type = new component + register in existing system. Adding decorative elements = new plugin. No core refactoring needed.

**Why NOT React Three Fiber:** R3F wraps Three.js in React's reconciliation model. The core loop here is "step Rapier 10,000 times in a tight loop, record positions, update geometry." That's imperative. R3F fights that.

### Plugin Structure

```
ecsify App
├── CorePlugin              -- Position, Rotation, Selection, AppMode resources
├── RenderPlugin            -- Three.js scene, MeshRef, camera, lights, mesh sync system
├── MidiPlugin              -- MIDI parsing, NoteEvent data, NoteIndex component
├── TrajectoryPlugin        -- Preview world, dot positioning, parametric chain cascade
├── ScenePlugin             -- Marble, Platform, Dot entities, placement, spawning
├── PhysicsPlugin           -- Rapier world (preview + playback), RigidBody, Collider
└── AudioPlugin             -- Tone.js synth, collision sound triggers (playback only)

React Shell (reads ECS state, dispatches actions)
├── <Canvas3D ref />        -- mounts Three.js renderer from RenderPlugin
├── <RightPanel />          -- reads Selection resource, shows properties
├── <TimelineBar />         -- reads NoteEvents + placed state, renders ticks
└── <UploadScreen />        -- parses MIDI, feeds into MidiPlugin
```

### How the Plugins Map to the Build Loop

```
1. User drops MIDI file
   → MidiPlugin parses it, stores NoteEvent[] as resource

2. User enters Build Mode
   → ScenePlugin spawns marble entity at start position
   → TrajectoryPlugin computes analytic trajectory (instant math)
   → ScenePlugin creates Dot entities at computed positions

3. User clicks a yellow dot
   → ScenePlugin creates Platform entity at dot position
   → TrajectoryPlugin re-runs preview world from that platform onward
   → ScenePlugin updates downstream dot positions

4. User rotates a platform
   → Changed(Rotation) detected by TrajectoryPlugin
   → re-simulate preview world from that platform, cascade downstream
   → during drag: only next 5-10 dots, full cascade on release

5. User hits Play
   → PhysicsPlugin creates Rapier world, spawns rigid bodies matching platforms
   → PhysicsPlugin steps Rapier in sync with requestAnimationFrame
   → AudioPlugin listens for collisions, triggers Tone.js notes
```

### Key ECS Concepts Used

**Components:**

```
Position        { x: number[], y: number[], z: number[] }    -- SoA, shared by all entities
Rotation        { x: number[], y: number[], z: number[] }    -- SoA, platforms
MeshRef         { mesh: THREE.Mesh }[]                        -- anything visible
NoteIndex       number[]                                      -- links entity to MIDI note
DotState        ('unplaced' | 'placed' | 'problem')[]
BounceVelocity  { x: number[], y: number[], z: number[] }    -- exit velocity after bounce
PlatformTag     {}                                            -- marker
MarbleTag       {}                                            -- marker
DotTag          {}                                            -- marker
```

**Resources:**

```
MidiData        { notes: NoteEvent[], trackName, bpm, duration }
PlaybackState   { mode: 'build' | 'play', time: number, playing: boolean }
SelectionState  { selectedEntity: id | null, hoveredEntity: id | null }
PreviewWorld    { world: RAPIER.World }  -- separate Rapier world for trajectory preview
PlaybackWorld   { world: RAPIER.World }  -- Rapier world for real-time playback
TrajectoryPath  { points: Vector3[] }    -- the blue line vertices
GravityConfig   { g: number }            -- tunable gravity
```

**System Sets (execution order):**

```
'Input'     → handle clicks, drags, keyboard
'Compute'   → preview world re-simulation when Changed(Rotation) or Added(PlatformTag)
'Physics'   → Rapier playback stepping (only active during play mode)
'Render'    → Position/Rotation → Three.js mesh transforms
'Audio'     → collision events → Tone.js notes (only active during playback)
```

**Change tracking for parametric chain:**

`Changed(Rotation)` on a platform entity triggers the trajectory compute system to re-simulate the preview world from that platform onward. ecsify's change tracking makes this declarative instead of manual event wiring.

### React ↔ ECS Communication

React doesn't own state. The ECS does. React is a view layer.

```
ECS → React:  React reads resources (SelectionState, MidiData, PlaybackState)
              on each frame via a shared reference or subscription.

React → ECS:  React calls app extensions:
              app.placePlatform(dotEntityId)
              app.rotatePlatform(entityId, rotation)
              app.setPlaybackMode('play')
              app.loadMidi(file)
```

App extensions (ecsify feature) expose clean callable APIs without React needing to know about entities/components internals.

## Tech Stack

| Component       | Library                               | Notes                                           |
| --------------- | ------------------------------------- | ----------------------------------------------- |
| ECS core        | ecsify                                | Plugins, systems, components, change tracking   |
| UI shell        | React                                 | Panels, timeline, upload flow, property editors |
| Rendering       | Three.js (vanilla)                    | 3D scene, camera, lighting, post-processing     |
| Physics         | Rapier 3D (@dimforge/rapier3d-compat) | Deterministic simulation, fixed timestep 1/240  |
| MIDI parsing    | @tonejs/midi                          | Extracts notes as {time, pitch, velocity}       |
| Audio synthesis | Tone.js                               | Plays MIDI notes with selectable instruments    |
| Animation       | GSAP                                  | UI transitions, spawn effects                   |
| Build           | Vite + TypeScript                     | WASM support for Rapier via vite-plugin-wasm    |

**Rapier is step-based, not frame-based.** `world.step()` advances physics by a fixed timestep regardless of rendering. For pre-computation, call it in a tight loop thousands of times without rendering. For playback, call it in sync with `requestAnimationFrame`. Fully decoupled from the render loop.

## V1 Scope

The minimum to prove the concept:

- ECS app with CorePlugin, PhysicsPlugin, RenderPlugin, MidiPlugin
- MIDI file upload and parsing (single track)
- Sample MIDI file included for instant demo
- Marble at draggable start position
- Pre-computed trajectory line (blue)
- Yellow dots at note positions along trajectory
- Click dot to place a straight platform
- Path re-computes from bounce on placement
- Rotate platform, path and downstream platforms re-compute live (via `Changed(Rotation)`)
- Play button: marble drops, physics runs, collision triggers note sound
- Reset button: marble returns to start
- Right panel: platform properties when selected
- Bottom timeline: note ticks, click to jump to note
- Save/load to localStorage

**Not in V1:** Multiple platform types, decorative elements, video export, multi-track, camera animation, undo/redo.

## Future Roadmap

| Phase  | Features                                                                                |
| ------ | --------------------------------------------------------------------------------------- |
| **V1** | ECS foundation + core build loop: upload, dots, place, rotate, play, save/load          |
| **V2** | Multiple platform types (new components/systems), decorative elements plugin, undo/redo |
| **V3** | Auto-adjust platform angle for optimal path to next note, instrument selector UI        |
| **V4** | Full auto-generation (place all platforms with one click), multi-track/multi-marble     |
| **V5** | Video export (CCapture.js + ffmpeg.wasm), shareable URLs, landing page                  |
