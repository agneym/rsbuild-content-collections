import { createRsbuild } from "@rsbuild/core";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pluginContentCollections } from "./index.js";

const mocks = vi.hoisted(() => ({
  build: vi.fn(),
  configureLogging: vi.fn(),
  createBuilder: vi.fn(),
  unsubscribe: vi.fn(),
  watch: vi.fn(),
}));

vi.mock("@content-collections/core", () => ({
  createBuilder: mocks.createBuilder,
}));

vi.mock("@content-collections/integrations", () => ({
  configureLogging: mocks.configureLogging,
}));

describe("pluginContentCollections", () => {
  let root: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    mocks.build.mockResolvedValue(undefined);
    mocks.unsubscribe.mockResolvedValue(undefined);
    mocks.watch.mockResolvedValue({ unsubscribe: mocks.unsubscribe });
    mocks.createBuilder.mockResolvedValue({
      build: mocks.build,
      watch: mocks.watch,
    });

    root = await mkdtemp(path.join(tmpdir(), "rsbuild-cc-"));
    await mkdir(path.join(root, "src"));
    await writeFile(path.join(root, "src/index.js"), "console.log('hi');");
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  function createInstance(options?: Parameters<typeof pluginContentCollections>[0]) {
    return createRsbuild({
      cwd: root,
      config: {
        plugins: [pluginContentCollections(options)],
        output: { distPath: { root: path.join(root, "dist") } },
      },
    });
  }

  it("builds once and does not watch on a production build", async () => {
    const rsbuild = await createInstance();
    await rsbuild.build();

    expect(mocks.createBuilder).toHaveBeenCalledOnce();
    expect(mocks.createBuilder).toHaveBeenCalledWith(path.join(root, "content-collections.ts"));
    expect(mocks.configureLogging).toHaveBeenCalledOnce();
    expect(mocks.build).toHaveBeenCalledOnce();
    expect(mocks.watch).not.toHaveBeenCalled();
  });

  it("watches during a watch build and unsubscribes on close", async () => {
    const rsbuild = await createInstance();
    const { close } = await rsbuild.build({ watch: true });

    // In watch mode the compile hooks run asynchronously after build() resolves.
    await vi.waitFor(() => expect(mocks.watch).toHaveBeenCalledOnce());
    expect(mocks.build).toHaveBeenCalledOnce();
    expect(mocks.unsubscribe).not.toHaveBeenCalled();

    await close();

    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
  });

  it("does not watch a watch build when isEnabled returns false", async () => {
    const rsbuild = await createInstance({ isEnabled: () => false });
    const { close } = await rsbuild.build({ watch: true });
    await close();

    expect(mocks.build).not.toHaveBeenCalled();
    expect(mocks.watch).not.toHaveBeenCalled();
    expect(mocks.unsubscribe).not.toHaveBeenCalled();
  });

  it("resolves a custom configPath against the project root", async () => {
    const rsbuild = await createInstance({ configPath: "config/cc.ts" });
    await rsbuild.build();

    expect(mocks.createBuilder).toHaveBeenCalledWith(path.join(root, "config/cc.ts"));
  });

  it("aliases content-collections to the generated directory", async () => {
    const rsbuild = await createInstance({ configPath: "config/cc.ts" });
    await rsbuild.initConfigs();
    const config = rsbuild.getNormalizedConfig();

    expect(config.resolve?.alias).toMatchObject({
      "content-collections": path.join(root, "config/.content-collections/generated"),
    });
  });

  it("keeps aliases from the user config", async () => {
    const rsbuild = await createRsbuild({
      cwd: root,
      config: {
        resolve: { alias: { components: path.join(root, "src") } },
        plugins: [pluginContentCollections()],
      },
    });
    await rsbuild.initConfigs();
    const config = rsbuild.getNormalizedConfig();

    expect(config.resolve?.alias).toMatchObject({
      components: path.join(root, "src"),
      "content-collections": path.join(root, ".content-collections/generated"),
    });
  });

  it("builds, watches, and unsubscribes when the dev server closes", async () => {
    const rsbuild = await createInstance();
    const { server } = await rsbuild.startDevServer({ getPortSilently: true });

    try {
      expect(mocks.build).toHaveBeenCalledOnce();
      expect(mocks.watch).toHaveBeenCalledOnce();
      expect(mocks.unsubscribe).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }

    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
  });

  describe("isEnabled", () => {
    it("receives the Rsbuild config", async () => {
      const isEnabled = vi.fn(() => true);
      const rsbuild = await createInstance({ isEnabled });
      await rsbuild.build();

      expect(isEnabled).toHaveBeenCalledOnce();
      expect(isEnabled).toHaveBeenCalledWith(
        expect.objectContaining({ plugins: expect.any(Array) }),
      );
    });

    it("skips building when it returns false", async () => {
      const rsbuild = await createInstance({ isEnabled: () => false });
      await rsbuild.build();

      expect(mocks.createBuilder).not.toHaveBeenCalled();
      expect(mocks.build).not.toHaveBeenCalled();
    });

    it("skips building and watching in dev when it returns false", async () => {
      const rsbuild = await createInstance({ isEnabled: () => false });
      const { server } = await rsbuild.startDevServer({
        getPortSilently: true,
      });
      await server.close();

      expect(mocks.createBuilder).not.toHaveBeenCalled();
      expect(mocks.watch).not.toHaveBeenCalled();
      expect(mocks.unsubscribe).not.toHaveBeenCalled();
    });

    it("still applies the alias when it returns false", async () => {
      const rsbuild = await createInstance({ isEnabled: () => false });
      await rsbuild.initConfigs();
      const config = rsbuild.getNormalizedConfig();

      expect(config.resolve?.alias).toMatchObject({
        "content-collections": path.join(root, ".content-collections/generated"),
      });
    });

    it("builds when it returns true", async () => {
      const rsbuild = await createInstance({ isEnabled: () => true });
      await rsbuild.build();

      expect(mocks.build).toHaveBeenCalledOnce();
    });
  });
});
