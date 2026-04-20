# Virtual Camera Foundation Architecture

Date: 2026-04-19
Status: provisional

## Context

The product only makes sense if NoDox can appear as a real camera device in other apps.

That means the virtual camera is not a later integration detail. It is the technical foundation of the project.

On macOS, the modern path for this is a native Camera Extension / System Extension workflow.

We originally considered Tauri because cross-platform UI still matters, especially for a later Windows version. But the immediate risk is not shared UI. The immediate risk is whether NoDox can:

- install and activate a real virtual camera on macOS
- feed frames into that camera reliably
- run the redaction pipeline fast enough for live use
- behave like a real camera in apps such as QuickTime, Zoom, Meet, and OBS

## Options Considered

### 1. Tauri Host App First

- keep NoDox as a Tauri app
- add native bindings through `swift-rs`
- later figure out how to bolt a Camera Extension target onto the Tauri bundle

Pros:

- preserves the current app direction
- keeps shared web UI in play from the start

Cons:

- puts the hardest platform-specific work behind a cross-platform shell
- Tauri is not the natural build/signing/bundling workflow for a macOS Camera Extension
- risks spending time on shell architecture before proving the real product constraint
- `swift-rs` is not enough by itself because the extension is a separate native target and process

### 2. Hybrid: Tauri Host App + Separate Native Camera Extension

- keep Tauri as the host UI
- build the Camera Extension separately in Xcode
- integrate the native extension into the shipped app bundle

Pros:

- preserves a possible cross-platform UI shell
- technically possible

Cons:

- still adds Tauri build complexity before the core camera path is proven
- signing, entitlements, activation, and packaging become more custom
- creates two kinds of complexity at once: virtual camera complexity and hybrid build complexity

### 3. Native macOS First

- build a native macOS host app
- build the Camera Extension in the normal Apple workflow
- keep the redaction engine portable where possible
- defer Tauri until after the virtual camera path is proven

Pros:

- matches the real macOS platform model
- makes extension targets, entitlements, signing, activation, and bundling much more natural
- gives the fastest path to answering the actual product-risk question
- still allows a shared Rust core for later Windows work

Cons:

- UI work is less reusable in the short term

## Decision

For the foundation milestone, NoDox should be native on macOS.

- build a native macOS host app
- add a native Camera Extension target
- treat the virtual camera as P0, not as a later output mode
- defer Tauri as the primary app shell for now

## Why This Is The Current Call

This is the most direct way to test whether NoDox is real.

- If the virtual camera cannot be made reliable on macOS, the project should probably stop early.
- If it can be made reliable, we can still choose later whether the shipping control UI should stay native or move to a shared shell.
- The virtual camera problem is fundamentally platform-native on both macOS and Windows, so making the device layer native does not work against the long-term cross-platform goal.
- What should be shared across platforms is the core detection and redaction engine, not the low-level camera-device integration.