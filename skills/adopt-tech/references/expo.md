# Expo / React Native

Lessons from [Kavtsya](https://github.com/git-sparrow/kavtsya) (Expo SDK 56–57, pnpm 11,
2026-07 to 2026-10). Version numbers here are history; look up the current ones.

## Where versions come from

- **The Expo SDK is the version authority** for `expo`, `expo-*`, `@expo/*`, `react`,
  `react-native`, `react-native-*` and `@types/react`. Add them with
  `npx expo install <pkg>`, never `pnpm add`: the SDK picks a known-good set, and a
  hand-picked newer version breaks the native build. Exclude this surface from
  Dependabot-style automation.
- `npx expo install --check` reports drift; `npx expo install --fix` realigns the set.
  Being a few patches behind inside the SDK is normal; realign on purpose, in its own
  change.
- The SDK major is the contract. A new SDK follows Expo's upgrade guide and the
  `upgrading-expo` skill in Expo's own skills (`expo/skills`).

## Checks

- `expo-doctor` validates the dependency set. Pin it on the merge gate
  (`npx expo-doctor@<exact>`): unpinned, its newest checks arrive on unrelated PRs.
- Its "packages match the installed SDK" check reads Expo's live version map and turns
  red when Expo publishes, with no change in the repo. Run that one as a scheduled
  monitor, and gate with `EXPO_DOCTOR_SKIP_DEPENDENCY_VERSION_CHECK=1`.
- Duplicate- and overridden-dependency findings are the ones that caught real defects.

## Traps

- **Release-age quarantine.** pnpm's minimum release age blocks a release published
  minutes ago, which is exactly when an Expo realign is tempting. Wait the window out
  rather than committing a `minimumReleaseAgeExclude` list.
- **Transitive Expo packages fork.** A package pulled in as a peer can drift to another
  version than `expo` wants. Fix it with `npx expo install <pkg>`, which declares it at
  the SDK's version; pnpm overrides and `--fix-lockfile` did not work.
- **`react-dom` must match `react` exactly.** Adding a DOM test library pulls it in and
  forks `expo`'s peer resolution. Test hooks with a DOM-free renderer.

## LLM resources (checked 2026-10-09)

- Expo's own skills: `expo/skills` (installable as a plugin marketplace).
- `https://docs.expo.dev/llms.txt` (index) and `https://docs.expo.dev/llms-full.txt`.

## Running the app

Use a development build for anything native (config plugins, native modules, E2E);
Expo Go covers only the modules bundled in it.
