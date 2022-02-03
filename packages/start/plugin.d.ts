export type Options = {
  adapter: string;
  appRoot: string;
  routesDir: string;
  ssr: boolean;
  prerenderRoutes: any[];
  inspect: boolean;
  routes?: RoutesCallback
  stringifyRoutes?: RoutesCallback
} & import("vite-plugin-solid").Options;
import { Plugin } from "vite";

export const start: (options?: Partial<Options>) => Plugin[];
export default start;

export type Route = {
  path: string
  src: string
  type: "PAGE"
  _id?: string
  componentSrc?: string
  dataSrc?: unknown
}

export type RouteRecord = {
  pageRoutes: Route[]
}

export type RoutesCallback =
  () => Promise<RouteRecord>

export type StringifyRoutesCallback =
  (routes:RouteRecord) => Promise<string>
