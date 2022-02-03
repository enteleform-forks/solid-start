export type Options = {
  adapter: string;
  appRoot: string;
  routesDir: string;
  ssr: boolean;
  prerenderRoutes: any[];
  inspect: boolean;
  routes?: RoutesCallback
  stringifyRoutes?: StringifyRoutesCallback
} & import("vite-plugin-solid").Options;
import { Plugin } from "vite";

export const start: (options?: Partial<Options>) => Plugin[];
export default start;

export type Route = {
  path: string
  src: string
  _id?: string
  componentSrc?: string
  dataSrc?: unknown
  type?: "PAGE"
}

export type RouteRecord = {
  pageRoutes: Route[]
}

export type RoutesCallback =
  () => Promise<RouteRecord>

export type StringifyRoutesCallback =
  (routes:RouteRecord) => Promise<string>
