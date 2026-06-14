import { join } from "path";

type WasmLoader = {
  prepareServerRuntime: () => void;
  getWasmBaseUrl: () => string;
};

function isNodeRuntime(): boolean {
  return typeof process !== "undefined" && Boolean(process.versions?.node);
}

/** Real Node require — webpack's bundled require breaks dynamic paths. */
function loadWasmLoaderModule(): WasmLoader {
  const loaderPath = join(
    process.cwd(),
    "lib",
    "analysis",
    "mediaPipeWasmLoader.cjs"
  );
  // eval("require") survives Next.js/webpack server bundling.
  const req = eval("require") as NodeRequire;
  return req(loaderPath) as WasmLoader;
}

export function ensureMediaPipeServerRuntime(): void {
  if (!isNodeRuntime()) return;
  loadWasmLoaderModule().prepareServerRuntime();
}

/** Local WASM assets — CDN script injection does not work in Node. */
export function getMediaPipeVisionWasmBaseUrl(): string {
  if (!isNodeRuntime()) {
    return "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm";
  }

  const loader = loadWasmLoaderModule();
  loader.prepareServerRuntime();
  return loader.getWasmBaseUrl();
}
