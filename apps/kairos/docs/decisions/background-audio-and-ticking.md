# Background Audio & Ticking

## Decision

Kairos uses two modes for alarm delivery and session audio, user-selectable via the session sound setting:

**Quiet mode (default):** A local notification fires at the scheduled end time. No background audio session. Zero battery drain during the session.

**Active mode (opt-in):** `UIBackgroundModes: audio` with continuous native tick playback for the duration. A native timer switches from tick to alarm sound at the end. A silent notification is still armed as a fallback in case the app is interrupted.

## Rationale

### UIBackgroundModes: audio is honest when ticking is on

Apple's criterion is that the app must be "actively playing audio for a user-directed purpose." A user who turns on ticking is explicitly asking for audio during the session. The entitlement is used only when the user expects it. If ticking is off, the audio session is never activated.

### Continuous native playback is required for background ticking

JS `setInterval` is throttled when the app is backgrounded, so a JS-only tick loop cannot maintain cadence. A native timer alone is also insufficient without active audio output. The solution is a single looping native audio track that embeds the tick cadence — the native timer only handles the end transition from ticking to alarm.

The JS countdown (timestamp math against `startedAt`) is unaffected and remains accurate on resume regardless of how long the interval was paused.

## Trade-offs

### Active mode battery drain

An active `AVAudioSession` with continuous audio draws sustained power. For a 25-minute session this is a few percent of battery. Acceptable for a user who opted in. Quiet mode users are unaffected.

### Quiet mode notification sound is capped at ~29s

`UNNotificationSound` plays once with no loop API. `prepareNotificationSound` pre-renders the selected sound looped to fill ~29 seconds and writes it to `Library/Sounds/` before scheduling. Users who want an indefinitely looping alarm should use Active mode.

### Single bundled session sound

Only one session sound is currently bundled (`tick.mp3`). Additional sounds would require new bundled assets.

## Alternatives Considered

### AlarmKit (future)

AlarmKit (iOS 26+) provides a dedicated alarm scheduling API with richer OS integration. Not used due to the iOS version floor. Quiet mode's `UNUserNotificationCenter` scheduling should migrate to AlarmKit once the minimum deployment target allows it.

### Silent keep-alive audio

Using silent audio to keep the app alive is brittle and review-hostile. Kairos does not do this — if background audio is active, the user explicitly asked for ticking and the app is playing it.

### BGTaskScheduler

Minimum interval of ~15 minutes, fires at iOS discretion. Not suitable for sub-minute precision. Rejected.

## Resources & References

- https://stackoverflow.com/questions/41492216/how-do-you-constantly-run-in-background
