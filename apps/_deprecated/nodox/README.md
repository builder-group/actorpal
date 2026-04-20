# NoDox

Native macOS app for the NoDox virtual camera prototype.

## Status: Discontinued

This prototype is discontinued.

Real-time OCR-based redaction as a virtual camera is not reliably viable. Vision cannot keep up with a 30 FPS frame budget without stalling or leaving gaps. A production-quality solution would require significantly more engineering investment than is justified for this experiment right now.

The code is preserved as a record of what was explored and why it did not work. See [docs/architecture.md](docs/architecture.md) for the system design.

## Development

- Build and run the `Nodox` app target in Xcode.
- Camera extension activation normally requires the app to live in `/Applications`.
- The host app also needs Camera permission because it discovers the virtual camera through AVFoundation before it connects to the CMIO sink stream.
- Prefer the normal `/Applications` flow for everyday development.
- System extension developer mode can skip the `/Applications` location check, but on our current setup it also requires disabling System Integrity Protection (SIP), so treat it as an optional low-level debugging path rather than the default workflow.
