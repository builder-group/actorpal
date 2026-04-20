# NoDox

Native macOS app for the NoDox virtual camera prototype.

## Development

- Build and run the `Nodox` app target in Xcode.
- Camera extension activation normally requires the app to live in `/Applications`.
- The host app also needs Camera permission because it discovers the virtual camera through AVFoundation before it connects to the CMIO sink stream.
- Prefer the normal `/Applications` flow for everyday development.
- System extension developer mode can skip the `/Applications` location check, but on our current setup it also requires disabling System Integrity Protection (SIP), so treat it as an optional low-level debugging path rather than the default workflow.

## Architecture

- `Nodox` activates the camera extension and discovers the virtual camera through AVFoundation before it connects to the CMIO sink stream.
- `Nodox` captures the main display with `ScreenCaptureKit`, adds the red test overlay, and pushes frames into the camera extension's CMIO sink stream.
- `Camera Extension` reads those buffers from the sink stream and republishes them through its source stream so OBS, QuickTime, and similar apps can select NoDox as a camera.
