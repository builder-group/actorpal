# 🐱 Tabby Tap

Your chill little keyboard companion and friend of Bongo Cat tapping away on your virtual keys.

## 📚 Learnings

### Package Dependencies

Swift Package Manager (SPM) dependencies are managed at the project level and can be shared across multiple targets. Packages are added to the project, then individual targets link to the packages they need. This keeps dependencies centralized and makes it easy to add the same package to multiple targets.

To configure: Select the **Project** (not target) in Xcode, go to the "Package Dependencies" tab, and click the "+" button to add a package. Enter the package URL or search for packages. After adding, link the package to specific targets in their "General" Tab under "Frameworks, Libraries, and Embedded Content" sections. See [Apple's documentation](https://developer.apple.com/documentation/xcode/adding-package-dependencies-to-your-app) for details.

**Example:** In this app, `KeyboardKit` is added as a package dependency and linked to both the main app and keyboard extension targets.

### Target Membership

A target in Xcode defines a product to build (app, extension, framework, etc.) with its own build settings, dependencies, and bundle. Target membership determines which files are compiled into each target. By default, files belong only to the target they were created in. To share code (models, utilities, extensions, etc.) between multiple targets without duplication, files must belong to all relevant targets. This allows both the app and extension to compile and access the same code at build time.

To configure: Open the right sidebar (top right corner), select the file to share, then under "Target Membership" check both the app and Keyboard targets. See [Apple's documentation](https://developer.apple.com/documentation/xcode/configuring-a-new-target-in-your-project) for details.

**Example:** In this app, `KeyboardApp+Extension.swift` defines the shared keyboard configuration and is included in both the main app and keyboard extension targets, so we don't need to create it twice.

### App Groups

App Groups enable multiple targets (like the main App and Keyboard Extension) to share data through a shared container. This allows syncing UserDefaults, files, and other data between the app and its extensions at runtime. Without App Groups, each target has isolated storage and cannot access each other's data.

To configure: Select the project in Xcode, choose both targets, go to "Signing & Capabilities" tab, and add the "App Groups" capability using the plus button in the top left corner. Use the same group ID for both targets. See [Apple's documentation](https://developer.apple.com/documentation/Xcode/configuring-app-groups) for details.

**Example:** In this app, we use `group.com.buildergroup.tabbytab` to share keyboard settings and configuration between the main app and keyboard extension, allowing the keyboard to access app preferences and vice versa.

### Store Data

Overview of local storage methods in iOS for persisting data on device. **Analogy to macOS/Tauri:** UserDefaults ≈ JSON file (simple key-value), CoreData/SQLite ≈ SQLite database (relational), FileManager ≈ direct file system access.

#### UserDefaults

Simple key-value storage for settings, preferences, and small data. Use `UserDefaults.standard` for app-only data, or `UserDefaults(suiteName: "group.com.buildergroup.tabbytab")` with App Groups to share data between app and extensions. Perfect for simple values like counters, booleans, strings, and small collections. See [Apple's UserDefaults documentation](https://developer.apple.com/documentation/foundation/userdefaults) for details.

**Example:** Store tap count with `sharedDefaults.set(tapCount, forKey: "tapCount")` and read it from either the app or keyboard extension using the same App Group UserDefaults instance.

#### CoreData

Apple's recommended object graph and persistence framework for native iOS/macOS apps. Use when you need relationships, migrations, complex queries, or large datasets. Requires more setup (data model, context, stack) but provides powerful features like relationships, fetch requests, automatic migrations, and change tracking. CoreData uses SQLite as its backend but adds an ORM abstraction layer, so you work with Swift objects rather than SQL. **Recommended for native iOS apps** when you need relational data. Overkill for simple key-value data. See [Apple's CoreData documentation](https://developer.apple.com/documentation/coredata) for details.

#### SQLite

Direct SQLite database access without CoreData's abstraction layer. Available through the SQLite C library or Swift wrappers (GRDB, SQLite.swift). Use when you need raw SQL queries, direct schema control, cross-platform compatibility, or are porting existing SQLite databases. CoreData uses SQLite under the hood, but direct SQLite gives you full SQL control. **Note:** React Native typically uses SQLite libraries (react-native-sqlite-storage) or Realm for relational data, and AsyncStorage for simple key-value storage. See [SQLite documentation](https://www.sqlite.org/docs.html) for details.

#### FileManager

File-based storage for documents, images, or custom data formats. Use `FileManager.default` to read/write files in app directories (Documents, Caches, Application Support). Works with App Groups to share files between targets. Best for large files, documents, or when you need direct file system access. See [Apple's FileManager documentation](https://developer.apple.com/documentation/foundation/filemanager) for details.

#### Keychain

Secure storage for sensitive data like passwords, tokens, and certificates. Encrypted and protected by the system. Use `KeychainAccess` framework or `Security` framework APIs. Required for storing credentials securely. See [Apple's Keychain Services documentation](https://developer.apple.com/documentation/security/keychain_services) for details.

## 🗂️ Assets

- `meow.mp3` ([Source](https://pixabay.com/de/sound-effects/cat-meow-8-fx-306184/))
- `base.png`, `left-down.png`, `left-up.png`, `right-down.png`, `right-up.png` ([Source](https://github.com/Gamma-Software/BongoCat-mac/tree/develop/Assets/resources/Images))