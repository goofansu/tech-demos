import { sceneById } from "./catalog.js";

export function demoPath(id) {
  return `/try/${id}`;
}

export function pageFromPath(pathname) {
  let path = String(pathname || "/").split("?")[0].split("#")[0];
  if (path.length > 1) path = path.replace(/\/+$/, "");
  if (path === "" || path === "/" || path === "/index.html") return { kind: "home" };
  const match = /^\/try\/([a-z0-9-]+)$/.exec(path);
  if (!match) return { kind: "missing" };
  const scene = sceneById(match[1]);
  return scene ? { kind: "demo", scene } : { kind: "missing" };
}
