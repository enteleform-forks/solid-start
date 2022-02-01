import { copyFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { rollup } from "rollup";
import vite from "vite";
import json from "@rollup/plugin-json";
import nodeResolve from "@rollup/plugin-node-resolve";
import common from "@rollup/plugin-commonjs";

export default function () {
  return {
    start(config) {
      import(pathToFileURL(join(config.root, "__Generated__", "Distribution", "index.js")));
    },
    async build(config) {
      const __dirname = dirname(fileURLToPath(import.meta.url));
      await vite.build({
        build: {
          outDir: "./__Generated__/Distribution/",
          minify: "terser",
          rollupOptions: {
            input: resolve(join(config.root, "__Source__", "__Client__", "__Main__")),
            output: {
              manualChunks: undefined
            }
          }
        }
      });
      await vite.build({
        build: {
          ssr: true,
          outDir: "./.solid/server",
          rollupOptions: {
            input: resolve(join(config.root, "__Source__", "__Server__", "__Main__")),
            output: {
              format: "esm"
            }
          }
        }
      });
      copyFileSync(
        join(config.root, ".solid", "server", `__Main__.js`),
        join(config.root, ".solid", "server", "app.js")
      );
      copyFileSync(join(__dirname, "entry.js"), join(config.root, ".solid", "server", "index.js"));
      const bundle = await rollup({
        input: join(config.root, ".solid", "server", "index.js"),
        plugins: [
          json(),
          nodeResolve({
            preferBuiltins: true,
            exportConditions: ["node", "solid"]
          }),
          common()
        ],
        external: ["undici", "stream/web"]
      });
      // or write the bundle to disk
      await bundle.write({ format: "esm", dir: join(config.root, "__Generated__", "Distribution") });

      // closes the bundle
      await bundle.close();
    }
  };
}
