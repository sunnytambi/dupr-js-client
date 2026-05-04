# Contributing to dupr-js-client

Thanks for taking the time to contribute. Here's what you need to know.

## Development setup

```bash
git clone https://github.com/sunnytambi/dupr-js-client.git
cd dupr-js-client
npm install
npm test          # run unit tests
npm run build     # compile to dist/
npm run typecheck # tsc --noEmit
npm run lint      # eslint
```

## Branch and PR workflow

- Fork the repo and create a branch from `main`.
- Branch names: `feat/short-description`, `fix/short-description`, `chore/short-description`.
- Open a PR against `main`. PRs require at least one approval before merge.
- Keep commits focused — one logical change per commit with a clear message.

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add PlayerRatingModule.getHistory()
fix: honour Retry-After header on 429
chore: update dependencies
docs: add auth code flow examples to README
test: add retry integration tests
```

## Tests

- Every new method or behaviour change must include a test in `test/`.
- Tests use **Vitest** with `customFetch` injection — no real network calls.
- Keep unit tests fast (<5 ms each).
- Integration tests (against the DUPR UAT sandbox) live in `test/integration/` and are opt-in:
  ```bash
  DUPR_CLIENT_KEY=xxx DUPR_CLIENT_SECRET=yyy npm run test:integration
  ```

## Code style

- TypeScript strict mode (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`).
- ESLint enforces style — run `npm run lint:fix` before committing.
- Prettier formats all files — run `npm run format` before committing.
- No runtime dependencies. If you need a new dependency, discuss in an issue first.

## Regenerating types

The types in `src/types.ts` are hand-rolled from the DUPR OpenAPI spec. To regenerate from the live spec:

```bash
npm run types:generate
```

This writes `src/types.generated.ts`. Review the diff carefully before committing — the live spec may differ from what the library currently supports.

## Releasing

Releases are triggered by pushing a commit to `main` whose message starts with `release:`:

```bash
npm version patch   # or minor / major
git commit -am "release: v0.2.0"
git push
```

The CI workflow will publish to npm automatically.

## Questions

Open an issue or start a discussion on GitHub. Please search existing issues before opening a new one.
