# Immich (Personal Fork)

This repository is a personal fork of the original Immich.

> The README from the upstream can be found [here](README_upstream.md).

## Purpose

I would like to layer on some additional features and customizations. I do not do this with the intent of contributing back to the original project, but may do so if I think it would be broadly useful.

## Features

### Live

### Planned

- Tags for "Person" entities.
- Comments/notes for "Person" entities.
- Show folder path in title bar in folder view.
- "Similar faces" section on the person view, using the existing face embedding vectors.
  - I think the "edit face" feature already does a search like this.
  - _Follow up_: Initiate people merge by dragging one avatar/badge onto another.
  - Merge similar people in the info tab of image view
- "Person" badges on each photo in the gallery/timeline views.
- A new folders view that uses the existing timeline/gallery view, instead of a custom view implementation.
- Bulk resolve duplicates between folders.
- Ability to map the local filesystem onto the external directory structure, and provide links to open the file in the OS file explorer.
  - This may require a browser extension, because I think the browser will not allow `file://` links to be opened from a web page that is not also `file://`.

## Repository Layout (for fork maintenance)

| Path                                                      | Stack                       | Notes                                                                         |
| --------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------- |
| `server/`                                                 | NestJS + TypeScript, Kysely | Migrations in `server/src/migrations/`, schema in `server/src/schema/tables/` |
| `web/`                                                    | SvelteKit + TypeScript      |                                                                               |
| `mobile/`                                                 | Flutter / Dart              | Contains the `mobile/.isar` git submodule                                     |
| `machine-learning/`                                       | Python                      |                                                                               |
| `cli/`, `e2e/`, `docs/`, `i18n/`, `open-api/`, `plugins/` | mixed                       | pnpm workspace packages                                                       |
| `.github/`                                                | CI                          | Currently emptied in this fork; restore selectively if needed                 |

Toolchain is pinned via `mise.toml` and the pnpm workspace in `pnpm-workspace.yaml`. Submodules: `mobile/.isar`, `e2e/test-assets` — remember `git submodule update --init --recursive` after a fresh clone or after upstream bumps either.

## Managing Upstream Changes

The driving constraint: **upstream must remain mergeable forever, with minimum hand-resolution per sync.** Every divergence from upstream is a recurring tax — each one has to be re-reconciled on every merge. Design every change to minimize that tax.

### Branching model

- `main` tracks `origin/main` (immich-app/immich) **unmodified**. Never commit fork work to `main`. Fast-forward only.
- `fork-main` is the integration branch. All fork work lives here or in feature branches that merge into it.
- Feature branches branch from `fork-main` and merge back into `fork-main`. Don't branch from `main`.
- Upstream is merged into `fork-main` primarily at `main`'s release tags, but can be merged between releases if needed (e.g. a critical bugfix).
- Tag fork releases (e.g. `fork-v2.7.5+1`) on `fork-main` so you can bisect later.

### Sync cadence

Pull from upstream **frequently** (weekly at minimum, or every release tag). Small, frequent merges are dramatically easier to resolve than a multi-month backlog where dozens of refactors compound.

```sh
git fetch origin
git checkout main && git merge --ff-only origin/main
git checkout fork-main && git merge main      # prefer merge over rebase — see below
```

Use `merge`, not `rebase`, on `fork-main`. Rebasing rewrites the fork's history on every sync and forces re-resolution of every prior conflict; merging localizes each sync's conflicts to one commit and keeps the fork's history stable for anyone (including future you) reading it.

After a merge:

1. Re-run `pnpm install` at the root — workspace lockfile churn is common.
2. Pull submodules: `git submodule update --init --recursive`.
3. Rebuild the server (`pnpm --filter immich build`) and run `pnpm --filter immich test` before touching the web/mobile builds.
4. If CI was restored, let it run; if not, run the targeted test suites for any package whose upstream files changed.

### Rules for fork-local changes

These rules exist to keep upstream merges cheap. Violate them only with a written reason in the commit message.

1. **Prefer additive files over edits.** A new file under a new directory (e.g. `server/src/fork/`, `web/src/lib/fork/`) never conflicts. Editing an upstream file always might.
2. **Touch upstream files at their seams, not their bodies.** Add a hook/event handler, register a new module, add a new route — don't reshape existing functions. If you must edit, keep diffs _small and localized_, ideally a single import line plus a single call site.
3. **No reformatting, renaming, or "drive-by" cleanups in upstream files.** These produce noisy merge conflicts with zero functional benefit.
4. **Database changes are additive only.** Never modify an upstream table definition in `server/src/schema/tables/`. Instead:
   - Add new tables in their own files (e.g. `server/src/schema/tables/fork-*.table.ts`) and register them in a fork-only index that's imported alongside the upstream one.
   - Put fork migrations in a separate directory or with a clearly-namespaced prefix (e.g. `1700000000000-fork-*.ts`) so they never collide with upstream timestamps.
   - Never alter or drop an upstream column. If you need extra columns on an upstream entity, put them on a sidecar table keyed by the upstream row's id.
5. **API additions go in new controllers/services/modules**, not by extending upstream ones. Mount them under a distinct route prefix (e.g. `/api/fork/...`). This also keeps the generated OpenAPI client diff clean.
6. **Web/UI changes prefer wrapping over editing.** New routes under `web/src/routes/fork/...`, new components under `web/src/lib/components/fork/`. When an upstream component must be replaced, swap at the import site rather than editing the component.
7. **Mobile (Flutter):** same principle — new screens/providers in fork-only files; avoid editing upstream Dart widgets directly.
8. **Translations:** add fork strings to a fork-specific namespace within `i18n/` so upstream translation drops don't clobber them.
9. **Don't bump dependencies independently.** Let upstream drive `package.json`/`pubspec.yaml`/`pyproject.toml` versions; fork bumps cause lockfile conflicts on every sync.
10. **Document every upstream-file edit.** Maintain a `dev-docs/fork-touchpoints.md` (create when first edit lands) listing each upstream file touched, why, and a one-line summary of the change — so future merges have a checklist.

### CI in the fork

Upstream CI was removed in this fork (`818a43fb2`). When restoring:

- Keep restored workflows in `.github/workflows/` with names that match upstream (so future upstream changes to those files merge naturally). Anything fork-specific goes in a separately-named workflow file.
- Don't re-enable workflows that publish artifacts to upstream registries (Docker Hub `ghcr.io/immich-app/*`, app stores, release notes). Use fork-owned destinations only.

### Conflict resolution heuristics

- A conflict in an upstream file you've edited → **accept upstream, then re-apply your minimal patch on top**. This is faster and safer than trying to merge inside the conflict markers, especially when upstream refactored the surrounding code.
- A conflict in a fork-only file → almost always means an upstream rename/move; fix the import paths and move on.
- Lockfile conflicts (`pnpm-lock.yaml`) → delete, re-run `pnpm install`, commit. Don't hand-merge.
- Generated files (`open-api/typescript-sdk/`, `open-api/python/`) → regenerate via the upstream's documented command rather than merging.

### Release tagging

Tag the fork's `HEAD` whenever you ship to your own deployment. Format suggestion: `<upstream-version>+fork.<n>` (e.g. `v2.7.5+fork.3`). This makes it trivial to identify what upstream version a deployed fork build corresponds to.

### When upstream drifts irreconcilably

If upstream changes an area you depend on so fundamentally that re-applying the fork patch becomes a multi-day effort:

- Stop. Re-evaluate whether the feature can be rebuilt _purely additively_ against the new upstream shape (a side module, a sidecar service, a plugin).
- If the answer is yes, throw away the old fork patch and start fresh; carrying a broken patch across merges is more expensive than re-implementing.
- Record the decision in `dev-docs/fork-touchpoints.md` so the abandoned approach isn't reattempted later.

## Notes

### Node Version

Node version is pinned in `.nvmrc` and `mise.toml`.
