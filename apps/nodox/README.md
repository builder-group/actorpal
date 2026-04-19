# NoDox

Native macOS app for the NoDox virtual camera prototype.

## Development

- Build and run the `Nodox` app target in Xcode.
- Camera extension activation normally requires the app to live in `/Applications`.
- Prefer the normal `/Applications` flow for everyday development.
- System extension developer mode can skip the `/Applications` location check, but on our current setup it also requires disabling System Integrity Protection (SIP), so treat it as an optional low-level debugging path rather than the default workflow: