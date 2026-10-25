import { createBuilder } from "@content-collections/core";
import { configureLogging } from "@content-collections/integrations";
import type { RsbuildPlugin } from "@rsbuild/core";
import path from "node:path";

export type PluginContentCollectionsOptions = {
  /** Path to the Content Collections config, relative to the Rsbuild root. */
  configPath?: string;
};

export function pluginContentCollections(
  options: PluginContentCollectionsOptions = {},
): RsbuildPlugin {
  const { configPath = "content-collections.ts" } = options;

  return {
    name: "content-collections",
    setup(api) {
      const resolvedConfigPath = path.resolve(api.context.rootPath, configPath);
      let unsubscribe: (() => Promise<void>) | undefined;

      const build = async () => {
        const builder = await createBuilder(resolvedConfigPath);
        configureLogging(builder);
        await builder.build();
        return builder;
      };

      api.modifyRsbuildConfig((config, { mergeRsbuildConfig }) =>
        mergeRsbuildConfig(config, {
          resolve: {
            alias: {
              "content-collections": path.resolve(
                path.dirname(resolvedConfigPath),
                ".content-collections/generated",
              ),
            },
          },
        }),
      );

      api.onBeforeBuild(async ({ isFirstCompile }) => {
        if (isFirstCompile) await build();
      });

      api.onBeforeStartDevServer(async () => {
        const subscription = await (await build()).watch();
        unsubscribe = () => subscription.unsubscribe();
      });

      api.onCloseDevServer(async () => {
        await unsubscribe?.();
      });
    },
  };
}
