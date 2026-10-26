import { createBuilder, type Builder } from "@content-collections/core";
import { configureLogging } from "@content-collections/integrations";
import type { RsbuildConfig, RsbuildPlugin } from "@rsbuild/core";
import path from "node:path";

export type PluginContentCollectionsOptions = {
  /** Path to the Content Collections config, relative to the Rsbuild root. */
  configPath?: string;
  /**
   * Decide from the final Rsbuild config whether to build and watch content.
   * The `content-collections` alias is applied either way.
   */
  isEnabled?: (config: Readonly<RsbuildConfig>) => boolean;
};

export function pluginContentCollections(
  options: PluginContentCollectionsOptions = {},
): RsbuildPlugin {
  const { configPath = "content-collections.ts", isEnabled } = options;

  return {
    name: "content-collections",
    setup(api) {
      const resolvedConfigPath = path.resolve(api.context.rootPath, configPath);
      let enabled = true;
      let unsubscribe: (() => Promise<void>) | undefined;

      const stopWatching = async () => {
        const stop = unsubscribe;
        unsubscribe = undefined;
        await stop?.();
      };

      const build = async () => {
        console.log(
          "Starting content-collections with config",
          path.relative(process.cwd(), resolvedConfigPath),
        );
        const builder = await createBuilder(resolvedConfigPath);
        configureLogging(builder);
        console.log("Start initial build");
        await builder.build();
        return builder;
      };

      const watch = async (builder: Builder) => {
        console.log("Start watching");
        const subscription = await builder.watch();
        unsubscribe = () => subscription.unsubscribe();
      };

      api.modifyRsbuildConfig({
        order: "post",
        handler: (config, { mergeRsbuildConfig }) => {
          enabled = isEnabled ? isEnabled(config) : true;
          return mergeRsbuildConfig(config, {
            resolve: {
              alias: {
                "content-collections": path.resolve(
                  path.dirname(resolvedConfigPath),
                  ".content-collections/generated",
                ),
              },
            },
          });
        },
      });

      api.onBeforeBuild(async ({ isFirstCompile, isWatch }) => {
        if (!enabled || !isFirstCompile) return;
        const builder = await build();
        if (isWatch) await watch(builder);
      });

      api.onCloseBuild(stopWatching);

      api.onBeforeStartDevServer(async () => {
        if (!enabled) return;
        await watch(await build());
      });

      api.onCloseDevServer(stopWatching);
    },
  };
}
