# Project Agent Guide

Use this file first when working in this repository. It defines the default agent workflow and points to the more specific rules and commands.

## Repository Context

- This is the builder.group Lab repository for experimental applications and product prototypes
- The active pnpm and Turbo workspace contains `apps/kairos` and `apps/learnlinesfaster`
- `apps/kairos` is an Expo and React Native application with local native Expo modules under `apps/kairos/modules`
- The top-level `apps/kairos/ios` and `apps/kairos/android` directories are generated and gitignored. Change Expo config, local modules, or application source instead of treating generated native projects as source.
- `apps/learnlinesfaster` is a React Router web application deployed through the Vercel React Router adapter
- `apps/derive` is a standalone native Swift and SwiftUI Xcode project. It is not part of the pnpm workspace.
- `apps/_deprecated` is historical. Do not update, validate, or use it as the model for active work unless the user explicitly places it in scope.
- Applications are private experiments rather than published packages. Preserve user behavior and local conventions, but do not assume package-level public API compatibility requirements.

## Working Model

- Follow the user request and explicit task constraints first
- If a rule appears to conflict with the user's explicit request or clearly implied task goal, follow the user. Mention meaningful conflicts briefly so the rule can be improved.
- Before editing, read the matching rule from `.agent/rules/`, the owning app README or project spec when relevant, and the nearby implementation
- Prefer repository conventions and local app patterns over generic defaults
- Keep changes focused on the requested behavior. Do not do unrelated cleanup or opportunistic rewrites.
- Match surrounding style unless a local, low-risk improvement makes the edited code clearer
- Add abstractions only when they remove real complexity, reduce meaningful duplication, or match an existing pattern
- Write comments, docs, and explanations for future maintainers rather than the current session
- Treat matching rules as the target standard for new and touched code. If rules conflict, the more specific pattern or framework rule wins.
- Do repo-wide cleanup only when the task explicitly calls for migration

## Git

- Use read-only git commands such as `git status`, `git diff`, `git log`, and `git show` when useful
- Do not stage, commit, create or switch branches, push, or otherwise mutate git state unless the user explicitly asks for that specific git action

## Validation

- Find the owning app and its scripts before choosing validation
- Prefer focused checks with `pnpm --filter @repo/kairos <script>` or `pnpm --filter @repo/learnlinesfaster <script>`
- Use root `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` when changes cross workspace boundaries or affect shared tooling
- For Kairos dependency or native integration changes, use Expo-compatible versions and validate with Expo tooling. Do not hand-edit generated `ios` or `android` output as the durable fix.
- For Dérive, validate with the Xcode project and an appropriate scheme or destination rather than pnpm
- Do not validate routine changes with browser-driven, Playwright/Cypress-style, or manual browser e2e testing unless explicitly asked. For UI-specific tasks, ask before starting a browser-based validation workflow.
- Report the checks you ran, and say clearly when a relevant check was skipped

## Rule Map

Use the closest matching rule for the file or behavior you are changing.

- TypeScript and TSX: `.agent/rules/typescript.md`
- React, React Native, and TSX components: `.agent/rules/react.md`
- `feature-state` and `feature-react/state`: `.agent/rules/feature-state.md`
- `feature-react` bindings: `.agent/rules/feature-react.md`
- `*Cx.ts` and `*Cx.tsx` feature context pattern: `.agent/rules/cx-pattern.md`
- Swift, SwiftUI, and Kairos native Expo modules: `.agent/rules/swift.md`
- Vitest tests: `.agent/rules/vitest.md`
- General code style: `.agent/rules/style-guide.md`
- Comments: `.agent/rules/comments.md`
- Writing style for prose, READMEs, and commit messages: `.agent/rules/writing.md`
- Writing and updating rules: `.agent/rules/rule-authoring.md`

## Commands

Commands are reusable workflows. Use them when the user asks for that workflow.

- Review staged changes before committing: `.agent/commands/review.md`
