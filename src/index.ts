import { createBuilder } from "@content-collections/core";
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

      const build = async () => {
        const builder = await createBuilder(resolvedConfigPath);
        configureLogging(builder);
        await builder.build();
        return builder;
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

      api.onBeforeBuild(async ({ isFirstCompile }) => {
        if (enabled && isFirstCompile) await build();
      });

      api.onBeforeStartDevServer(async () => {
        if (!enabled) return;
        const subscription = await (await build()).watch();
        unsubscribe = () => subscription.unsubscribe();
      });

      api.onCloseDevServer(async () => {
        await unsubscribe?.();
      });
    },
  };
}
