import path from "path";
import { normalizePath } from "vite";
import manifest from "rollup-route-manifest";
import solid from "vite-plugin-solid";
import inspect from "vite-plugin-inspect";
import { getRoutes, stringifyRoutes } from "./routes.js";
import { createDevHandler } from "./runtime/devServer.js";
import c from "picocolors";
import babel from "@babel/core";
import babelServerModule from "./server/babel.js";

/**
 * @returns {import('vite').Plugin}
 */
function solidStartRouter(options) {
  let lazy;
  return {
    name: "solid-start-router",
    enforce: "pre",
    configResolved(config) {
      lazy = config.command !== "serve";
    },
    async transform(code, id, transformOptions) {
      const isSsr =
        transformOptions === null || transformOptions === void 0 ? void 0 : transformOptions.ssr;
      if (/.data.(ts|js)/.test(id)) {
        return babel.transformSync(code, {
          filename: id,
          presets: ["@babel/preset-typescript"],
          plugins: [
            [
              babelServerModule,
              {
                ssr: isSsr ?? false,
                root: process.cwd(),
                minify: false,
                //minify: process.env.NODE_ENV === "production"
              }
            ]
          ]
        });
      }

      if (code.includes("const routes = $ROUTES;")) {
        const routes =
          options.routes
          ? ensureRoutesData(await options.routes())
          : await getRoutes({
            pageExtensions: [
              "tsx",
              "jsx",
              "js",
              "ts",
              ...(options.extensions?.map(s => (Array.isArray(s) ? s[0] : s)).map(s => s.slice(1)) ??
                [])
            ]
          });

        const stringifiedRoutes =
          options.stringifyRoutes
          ? await options.stringifyRoutes(routes)
          : stringifyRoutes(routes, { lazy })

        return { code: code.replace("const routes = $ROUTES;", stringifiedRoutes) };
      }
    }
  };
}

function solidStartBuild(options) {
  return {
    name: "solid-start-build",
    config(conf) {
      const regex = new RegExp(
        `(index)?(.(${[
          "tsx",
          "ts",
          "jsx",
          "js",
          ...(options.extensions?.map(e => e.slice(1)) ?? [])
        ].join("|")}))$`
      );

      const root = normalizePath(conf.root || process.cwd());
      return {
        build: {
          target: "esnext",
          manifest: true,
          rollupOptions: {
            plugins: [
              manifest({
                inline: false,
                merge: false,
                publicPath: "/",
                routes: file => {
                  file = file.replace(path.posix.join(root, options.appRoot), "").replace(regex, "");
                  if (!file.includes(`/${options.routesDir}/`)) return "*"; // commons
                  console.log({"@":"Route", path:("/" + file.replace(`/${options.routesDir}/`, ""))})
                  return "/" + file.replace(`/${options.routesDir}/`, "");
                }
              })
            ]
          }
        }
      };
    }
  };
}

/**
 * @returns {import('vite').Plugin}
 */
function solidStartServer(options) {
  let config;
  return {
    name: "solid-start-dev",
    configureServer(vite) {
      return () => {
        remove_html_middlewares(vite.middlewares);

        vite.middlewares.use(createDevHandler(vite));

        // logging routes on server start
        vite.httpServer?.once("listening", async () => {
          const protocol = config.server.https ? "https" : "http";
          const port = config.server.port;

          const routes =
            options.routes
            ? ensureRoutesData(await options.routes())
            : await getRoutes({
              pageExtensions: [
                "tsx",
                "jsx",
                "js",
                "ts",
                ...(options.extensions
                  ?.map(s => (Array.isArray(s) ? s[0] : s))
                  .map(s => s.slice(1)) ?? [])
              ]
            });
          const label = `  > Routes: `;
          setTimeout(() => {
            // eslint-disable-next-line no-console
            console.log(
              `${label}\n${routes.pageRoutes
                .flatMap(r => (r.children ? r.children : [r]))
                .map(r => `     ${c.blue(`${protocol}://localhost:${port}${r.path}`)}`)
                .join("\n")}`
            );
          }, 100);
        });
      };
    },
    configResolved: conf => {
      config = conf;
    },
    config(conf) {
      const root = conf.root || process.cwd();
      return {
        resolve: {
          conditions: ["solid"],
          alias: [
            {
              find: "~",
              replacement: path.join(root, options.appRoot)
            }
          ]
        },
        ssr: {
          noExternal: ["solid-app-router", "solid-meta", "solid-start"]
        },
        solidOptions: options
      };
    }
  };
}

/**
 * @returns {import('vite').Plugin[]}
 */
export default function solidStart(options) {
  options = Object.assign(
    {
      adapter: "solid-start-node",
      appRoot: "src",
      routesDir: "routes",
      ssr: true,
      prerenderRoutes: [],
      inspect: true
    },
    options ?? {}
  );

  return [
    options.inspect ? inspect() : undefined,
    solid({
      ...(options ?? {}),
      babel: (source, id, ssr) => ({
        plugins: [
          [
            babelServerModule,
            { ssr, root: process.cwd(), minify: false }
            //{ ssr, root: process.cwd(), minify: process.env.NODE_ENV === "production" }
          ]
        ]
      })
    }),
    solidStartRouter(options),
    solidStartServer(options),
    solidStartBuild(options)
  ].filter(Boolean);
}

/**
 * @param {import('vite').ViteDevServer['middlewares']} server
 */
function remove_html_middlewares(server) {
  const html_middlewares = [
    "viteIndexHtmlMiddleware",
    "vite404Middleware",
    "viteSpaFallbackMiddleware"
  ];
  for (let i = server.stack.length - 1; i > 0; i--) {
    // @ts-ignore
    if (html_middlewares.includes(server.stack[i].handle.name)) {
      server.stack.splice(i, 1);
    }
  }
}

/**
 * @param {import('./plugin').RouteRecord} routes
 * @returns {import('./plugin').RouteRecord}
 */
function ensureRoutesData(routes) {
	const result = {pageRoutes:[]}
	for (const route of routes.pageRoutes) {
		result.pageRoutes.push({
			path: route.path,
			src: route.src,
			type: route.type,
			_id: route._id ?? route.path,
			componentSrc: route.componentSrc ?? route.src,
			dataSrc: route.dataSrc,
		})
	}
	return result
}
