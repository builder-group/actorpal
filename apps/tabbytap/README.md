# 🐱 Tabby Tap

Your chill little keyboard companion and friend of Bongo Cat tapping away on your virtual keys.

## 📚 Learnings

### Configure Target Membership

The main App and Keyboard Extension are separate targets in Xcode. To share code (models, utilities, etc.) between them, files must belong to both targets. Open the right sidebar (top right corner), select the file to share, then under "Target Membership" check both the app and Keyboard targets.

**Example:** `KeyboardApp+Extension.swift` is shared between both targets, so we don't need to create it twice.