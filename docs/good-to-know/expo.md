# Expo

## Expo UI Custom Views Must Be Wrapped in `Host`

Expo UI components (including custom Expo UI native views) must be rendered inside `<Host />`.

**Symptom**

- App crashes without any error when the Expo UI view renders.

**Fix**

- Wrap the part of the tree using Expo UI in `<Host />`.

Example:

```tsx
import { Host } from '@expo/ui/swift-ui';

export function Screen() {
  return <Host style={{ flex: 1 }}>{/* Expo UI components + custom Expo UI native views */}</Host>;
}
```

## Developing Local Expo Modules in Xcode

- https://www.youtube.com/watch?v=zReFsPgUdMs

### Workflow

1. Open the iOS project in Xcode from app root:
   - `cd apps/kairos`
   - `xed ios`
2. In Xcode, open the `Pods` project in the left sidebar.
3. Expand `Development Pods`.
4. Find your local module pod (for example `WheelPickerUi`, `TimePicker`, etc.).
5. Edit native files there and build/run from Xcode or `npx expo run:ios`.

`Development Pods` maps to your local module source, so edits there update your module files.

After module file structure changes, run:

- `cd apps/kairos/ios && pod install`
