# @agney/rsbuild-content-collections

Unofficial [Rsbuild](https://rsbuild.rs) plugin for [Content Collections](https://www.content-collections.dev).
Modeled on the official [`@content-collections/vite`](https://www.content-collections.dev/docs/quickstart/vite) plugin.

```ts
// rsbuild.config.ts
import { defineConfig } from "@rsbuild/core";
import { pluginContentCollections } from "@agney/rsbuild-content-collections";

export default defineConfig({
  plugins: [pluginContentCollections()],
});
```

Options: `configPath` (default `content-collections.ts`).
