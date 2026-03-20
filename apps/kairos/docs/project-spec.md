# Kairos - Project Spec

> Set a range. The timer fires somewhere inside it. You never know exactly when.

**App Store Name:** Kairos
**App Store Subtitle:** Random Interval Timer
**Bundle ID:** com.buildergroup.kairos
**Platform:** iOS first (Android possible later)
**Stack:** React Native, Expo, TypeScript, expo-apple-targets, feature-state

## Concept

A random interval timer that feels like it belongs on iOS. You set a minimum and maximum duration. Kairos picks a random moment in between and fires. That's it.

The randomness is the feature, not a bug, not a limitation. It's what makes it useful for meditation (you don't know when silence ends), exercise (you can't brace for the interval), studying (gap effect / spacing effect), and party games (Musical Chairs, Hot Potato, Catch Phrase).

Three screens: Setup, Running, Done.

## Why React Native

Web stack is all React and TypeScript, so React Native is a natural fit language-wise. The open question has always been the native side: managing an `ios/` folder alongside RN code never felt worth it over just building native.

`expo-apple-targets` changes that calculus. Native targets (widgets, Live Activities) now live in their own `targets/` folder, wired into the generated Xcode project by a config plugin during `expo prebuild`. The `ios/` folder is generated and gitignored. You never touch it. The main app stays 100% TypeScript. The only Swift written is the widget view itself.

Kairos is an experiment to see if this workflow actually holds up and whether building in React Native + Expo feels better or worse than native Swift. Simple enough that RN won't fight you, just complex enough (Live Activity) to stress-test the native target integration.

## Core Mechanics

### Random Duration

On start, Kairos draws a random duration uniformly distributed between `[min, max]` and counts down from there. When it hits zero, the alarm fires.

### Hide Mode

Optional toggle. The countdown is hidden, replaced by a pulsing indicator. Makes the randomness feel genuinely surprising. Useful for meditation and games where knowing the remaining time defeats the purpose.

### Loop Mode

After the alarm fires, Kairos picks a new random duration and starts again. A loop counter tracks how many rounds have completed. An optional break period can be inserted between loops.

## How It Works

```
1. Set min + max time
2. Toggle Hide / Loop / Break period as needed
3. Hit Start → random duration drawn, alarm scheduled, Live Activity starts
4. Timer counts down (or pulses in Hide mode)
5. Alarm fires: sound + haptic
6. Loop on → break period → new random timer
7. Loop off → Done screen
```

Background behavior: a local notification is scheduled at the computed end time when the timer starts. If the app is foregrounded when it fires, the alarm plays in-app. If backgrounded, the system notification fires. Live Activity shows the countdown on the Lock Screen and Dynamic Island throughout.

## Sound & Haptics

- Alarm sound when timer fires, with built-in tones to choose from
- Haptic feedback on fire and on start
- Silent mode: alarm plays regardless by default (like Clock.app), vibrate-only option available

## Architecture

Expo managed workflow. The `ios/` folder is generated and gitignored. All native-target code lives in `targets/`. Code is organized into vertical feature slices, each owning its UI, logic, and state.

```
kairos/
├── src/
|   ├── app/                  -- Expo Router screens (routes compose features, no domain logic)
│   ├── environment/          -- config, constants
│   ├── lib/                  -- shared utilities
│   └── features/
│       ├── timer/            -- random draw, countdown, loop state machine, and native alarm delivery policy
│       ├── audio/            -- alarm playback (expo-av)
│       ├── live-activity/    -- start/stop/update Live Activity
│       └── preset/           -- built-in + user presets, persisted via feature-state
└── targets/
    └── widget/               -- Live Activity Swift target (expo-apple-targets)
```

### State Management

`feature-state` (`$`-prefixed atoms) owns all app state. `withStorage()` handles persistence via an AsyncStorage adapter. No separate persistence layer needed.

### Live Activity

The `targets/widget/` folder contains the Swift Live Activity view. `expo-apple-targets` config plugin links it into the generated Xcode project during `expo prebuild`. The RN side starts/stops/updates the activity via the expo-apple-targets JS API. The widget uses a timer interval for the countdown so it updates without waking the app.

## V1 Scope

- Min/max time picker (seconds + minutes, up to 1 hour)
- Random timer draw on start
- Countdown display
- Alarm: sound + haptic on fire
- Background support via local notification
- Hide mode
- 4 built-in presets (Plank, Study, Zen, Hot Potato)
- Live Activity: Lock Screen + Dynamic Island compact

**Not in V1:** Loop mode + break period, user-saveable presets, expanded Dynamic Island, custom alarm sounds.
