# NoDox - Project Spec

> Capture a window. Detect sensitive text locally. Blur it before it gets shared.

**App Name:** NoDox
**Tagline:** Safe screen sharing without accidental leaks
**Bundle ID:** com.buildergroup.nodox
**Platform:** macOS first
**Stack:** Tauri, Rust, Apple Vision, ScreenCaptureKit

## Concept

NoDox is a macOS experiment for safe screen sharing and recording.

The idea is simple: instead of sharing the real app or window directly, NoDox captures it, analyzes the visible content locally, blurs sensitive text, and outputs the sanitized result for sharing.

The immediate use case is practical and personal:

- Apple Settings exposes the logged-in email
- `npm publish` can expose an IP address
- Claude and other apps can expose email/account information
- demos, streams, and recordings often include brief accidental leaks

If NoDox works, it becomes a protective layer between the real window and the thing being shared. If it does not work reliably enough, the experiment should make that clear quickly.

## Core Question

This project is not starting as a full product build. It starts as a technical validation.

The question is:

**Can a local macOS pipeline detect sensitive on-screen text fast enough and accurately enough to make live redaction actually useful?**

That breaks down into:

1. Can Apple Vision detect on-screen text with usable bounding boxes?
2. Can the system keep up with real screen content, not just static demo images?
3. Can text be blurred before it becomes a practical leak?
4. Is the result trustworthy enough to justify continued investment?

If the answer is no, the project should be killed early rather than stretched into a weak “best effort” privacy app.

## Product Shape

The intended shape is:

`selected window/screen -> NoDox capture pipeline -> sensitive-text detection -> blur/redact -> sanitized output`

The output may eventually be:

- a virtual camera / virtual source
- a shareable window
- an OBS input path

The prototype does not need to solve all output modes yet. The first milestone is proving the redaction loop itself.

## Why macOS First

macOS has the strongest path for this experiment:

- `ScreenCaptureKit` for modern window and display capture
- `Vision` for on-device OCR with bounding boxes
- local processing without cloud dependencies

The benchmark work already suggests Apple Vision is dramatically faster than the generic OCR path tested with `ocrs`, which makes macOS the best place to validate the idea before considering anything cross-platform.

## What Counts As Success

The prototype succeeds if it can:

- capture one chosen window reliably
- detect visible text locally
- identify obviously sensitive strings such as emails
- return usable coordinates for blurring
- render a sanitized preview with low enough latency to feel plausible
- hold up on real app content such as settings panes, terminals, browser pages, and chat/code tools

The prototype does **not** need to prove a perfect universal product. It needs to answer whether there is enough real signal to keep going.

## What Counts As Failure

The prototype fails if any of these are true:

- OCR is too slow on real screen content to be usable
- bounding boxes are too unstable or inaccurate to blur safely
- sensitive content appears too briefly to catch in practice
- the delay needed for safety makes the experience unacceptable
- the system works only on cherry-picked examples and not real apps

If the system cannot protect against the kind of leaks that motivated the project in the first place, then there is no point in continuing.

## Architecture

NoDox should be split into four simple parts:

### 1. Capture

- Select a target window
- Capture frames using `ScreenCaptureKit`
- Resize or sample frames for analysis as needed

### 2. OCR

- Use Apple Vision for text recognition
- Retrieve recognized text plus bounding boxes
- Start with line-level boxes; move to tighter boxes if needed

### 3. Detection

- Run lightweight local pattern matching over OCR output
- Map matches back to image-space rectangles
- Maintain temporary tracking/persistence to avoid flicker

### 4. Rendering

- Draw blur/redaction regions over matched boxes
- Show a sanitized preview first
- Virtual camera or external output comes later

## Non-Goals For The Prototype

- cross-platform support
- perfect universal protection claims
- polished branding/marketing site
- multi-camera/output orchestration
- broad app integrations

## Initial UX

The first UX can be minimal:

1. Pick a window
2. Start capture
3. Toggle debug overlays
4. See detected text boxes
5. Enable sensitive-text redaction
6. View sanitized output preview

That is enough to decide whether the core mechanic is real.