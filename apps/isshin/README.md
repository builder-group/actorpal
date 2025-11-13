# `@repo/isshin`


## 📚 Learnings

### Persist Data

- LocalStorage - UI preferences that are not critical; things the user wouldn't mind losing.
- `tauri-plugin-store` - Backend preferences that are somewhat critical, like API keys or license keys; gives more control over storage.
- `tauri-plugin-sql` (SQLite) - Long-term and larger datasets; provides the flexibility and power of a real database while being embedded, zero-setup, and fully portable. Note: PostgreSQL isn't feasible because it isn't embeddable -> users would need to install and run a separate server, which is impractical for a desktop app ([see discussion](https://github.com/tauri-apps/tauri/discussions/5418)).

For more details on persistent state in Tauri apps, see [this guide](https://aptabase.com/blog/persistent-state-tauri-apps).

## 💡 Resources / References

- [SelfControl](https://github.com/SelfControlApp/selfcontrol)
- [RescueTime ](https://rescuetime.com)
- [ActivityWatch](https://github.com/ActivityWatch/activitywatch)

- [active-win-pos-rs](https://github.com/dimusic/active-win-pos-rs)
- [winshift-rs](https://github.com/efJerryYang/winshift-rs)
- [ferrous-focus](https://github.com/eurora-labs/ferrous-focus)
- [aw-watcher-window](https://github.com/ActivityWatch/aw-watcher-window)