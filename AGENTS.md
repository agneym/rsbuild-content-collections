# Agent Instructions

Unofficial Rsbuild plugin for Content Collections, published as `@agney/rsbuild-content-collections`.

## Reference repository

The upstream Content Collections monorepo is cloned (shallow) at `../content-collections` (source: https://github.com/sdorra/content-collections). Use it as the reference implementation; do not edit it.

- `../content-collections/packages/vite`: the official Vite plugin this package is modeled on (`src/index.ts`, `src/index.test.ts`).
- `../content-collections/packages/core`: `createBuilder` and the builder `build()` / `watch()` API.
- `../content-collections/packages/integrations`: `configureLogging`.
- `../content-collections/packages/{next,remix-vite,vinxi}`: other bundler integrations for comparison.

Refresh with `git -C ../content-collections pull`.

## Stack and commands

- TypeScript, ESM only, built with `tsdown`; bun is the package manager.
- `bun run build`, `bun run lint`, `bun run format`.
- ALWAYS run `bun run lint` before finishing.

## Behavior to keep in line with the Vite plugin

- Alias `content-collections` to `<config dir>/.content-collections/generated`.
- Build once before the production build (first compile only); build and `watch()` in dev, and unsubscribe when the dev server closes.
