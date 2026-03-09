# Kairos

**Kairos** (Greek: καιρός, "the right or opportune moment") is a random interval timer for iPhone.  
You set a minimum and maximum duration, start, and the alarm fires at an unknown moment inside that range.

Kairos is built for moments where exact timing gets in the way: meditation, exercise, study, and party games.

## Concept

Most timers are predictable. Kairos is intentionally not.

- **Set a Range** — Choose minimum and maximum duration
- **Start Once** — Kairos draws a random duration in `[min, max]`
- **Stay Present** — Optional Hide mode replaces countdown with a pulsing indicator
- **Fire** — Alarm sound + haptic when time is up

## Tech

Kairos is built with **React Native + Expo + TypeScript** and uses **expo-apple-targets** for the Live Activity widget target.
