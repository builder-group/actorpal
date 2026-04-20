# Architecture

## What it does

Nodox captures a screen source, detects sensitive text via OCR, redacts it, and pushes the result into a virtual camera that any app can use.

## System overview

```
Screen source
     |
     v
Nodox app  (capture, OCR, redaction)
     |
     v
Camera extension  (virtual camera device)
     |
     v
OBS / QuickTime / any camera consumer
```

The camera extension is a separate system process. The app feeds it frames over a CMIO sink stream. The extension republishes them so the virtual camera appears like any other camera to the OS.

## Redaction modes

**Live**: frames are redacted as they arrive using the most recent OCR result. Fast but there is a short gap between text appearing and being redacted.

**Delayed**: frames are held in chunks. OCR samples the last frame of each chunk and applies that result to the whole chunk before release. This lowers leak risk, but text that appears only between sampled frames can still be missed. To keep delay bounded, Nodox analyzes at most one chunk at a time and reuses the most recent sampled overlay if OCR falls behind.
