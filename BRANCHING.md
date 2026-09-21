# Branching strategy — trunk-based development

`main` is the trunk. It is always deployable: every commit on `main` passes `npm test`
and the app opens cleanly from `index.html`. There are no long-lived `develop`,
`release`, or `hotfix` branches.

## The rules

1. **Branch from `main`, merge back to `main`, within ~1–2 days.**
   Short-lived feature branches only. If a branch is older than two days, split the
   work or merge what's done behind a flag (see §Incomplete work).
2. **One concern per branch.** A branch does one unit from `SPEC.md` (e.g. `U1`), or one
   fix. Don't bundle "while I was in there" changes — open a second branch.
3. **PR into `main`, CI green, then squash-merge.** `main` gets one commit per PR with a
   message that reads like a changelog line. Delete the branch on merge.
4. **Rebase, don't merge, to catch up.** `git pull --rebase origin main` on your branch.
   Never merge `main` into a feature branch; never force-push `main`.
5. **Tag releases from `main`; never branch for them.** A release is just a tag on
   trunk (`v1.3.0`). If a release needs a fix, fix it on `main` and tag again.
6. **Never commit directly to `main`.** Even for one-liners. The PR is the audit trail
   and the CI gate.

## Branch naming

```
<type>/<short-kebab-description>
```

| type | use for |
|---|---|
| `feat/` | new behavior (`feat/shelf-life-badge`, `feat/recipe-import-parser`) |
| `fix/`  | bug fix (`fix/snack-dedupe`) |
| `chore/`| tooling, CI, deps, docs (`chore/test-harness`, `chore/branching-doc`) |
| `spike/`| throwaway exploration — never merged, deleted when done |

## Day-to-day flow

```bash
git switch main && git pull --rebase origin main
git switch -c feat/shelf-life-badge
# ... work, commit early and often ...
npm test
git push -u origin feat/shelf-life-badge
gh pr create --fill          # CI runs npm test
# review / self-review, then:
gh pr merge --squash --delete-branch
```

## Commit messages

Imperative mood, ≤ 72-char subject, body explains *why* when it isn't obvious.
The squash commit on `main` should be rewritten to summarize the PR, not list WIP commits.

```
Add shelf-life badge to grocery list items

Items under 30 days show "good ~5–7 days" so perishables are visible
at a glance. Pantry items are suppressed to keep the list quiet.
```

## Incomplete work on trunk (feature flags)

Trunk-based means merging *before* a feature is finished. For this app, a flag is a
constant at the top of `app.js`:

```js
const FEATURES = { recipeImport: false, cookThisWeek: false };
```

Gate the UI entry point (`if (FEATURES.recipeImport) …`) so the code ships dark.
Flip the flag in its own tiny PR when the feature is done. Remove the flag within a
week of flipping it — stale flags are debt.

## What CI checks (`.github/workflows/ci.yml`)

- `npm test` on every PR and every push to `main`.
- Blocks merge on failure once branch protection is enabled (see below).

## Releases

- Bump `CACHE_NAME` in `sw.js` (e.g. `grocery-planner-v2`) in the PR that ships
  user-visible changes — otherwise installed PWAs keep serving the old files.
- Tag from `main` after merge:
  ```bash
  git tag -a v1.1.0 -m "Shelf-life badges" && git push origin v1.1.0
  ```
- Semver: `major` = data-model change that isn't backward compatible with existing
  `localStorage`; `minor` = new feature; `patch` = fix.

## One-time setup: protect `main`

Run once (requires repo admin):

```bash
gh api -X PUT repos/jgburto/grocery-planner/branches/main/protection \
  -f required_status_checks[strict]=true \
  -f required_status_checks[contexts][]=test \
  -F enforce_admins=false \
  -f required_pull_request_reviews[required_approving_review_count]=0 \
  -F restrictions=null \
  -F allow_force_pushes=false \
  -F allow_deletions=false
```

`required_approving_review_count=0` because this is a solo project; CI is the gate.
Raise it to 1 if a second contributor joins.

## Why trunk-based here

- Solo/small project: long-lived branches only create merge pain with no upside.
- No build step and a fast test suite mean the trunk can *always* be run — there's
  nothing to "stabilize" on a release branch.
- `SPEC.md` already decomposes work into small independently-verifiable units, which
  maps 1:1 onto short-lived branches.
