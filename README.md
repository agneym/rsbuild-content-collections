# @agney/rsbuild-content-collections

[![npm version](https://img.shields.io/npm/v/@agney/rsbuild-content-collections)](https://www.npmjs.com/package/@agney/rsbuild-content-collections)

Unofficial [Rsbuild](https://rsbuild.rs) plugin for [Content Collections](https://www.content-collections.dev).
Modeled on the official [`@content-collections/vite`](https://www.content-collections.dev/docs/quickstart/vite) plugin.

## Installation

The plugin has `@content-collections/core` and `@rsbuild/core` as peer dependencies.

```sh
npm install -D @agney/rsbuild-content-collections @content-collections/core
```

Use your package manager of choice (`pnpm add -D`, `yarn add -D`, `bun add -d`).

## Usage

```ts
// rsbuild.config.ts
import { defineConfig } from "@rsbuild/core";
import { pluginContentCollections } from "@agney/rsbuild-content-collections";

export default defineConfig({
  plugins: [pluginContentCollections()],
});
```

### Options

| Option       | Type                                           | Default                    | Description                                                                                                          |
| ------------ | ---------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `configPath` | `string`                                       | `"content-collections.ts"` | Path to the Content Collections config, relative to the Rsbuild root.                                                |
| `isEnabled`  | `(config: Readonly<RsbuildConfig>) => boolean` | always enabled             | Called with the final Rsbuild config; return `false` to skip building and watching. The alias is applied either way. |
