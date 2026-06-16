import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { pathToFileURL } from "url";
import vm from "vm";

declare const __non_webpack_require__: NodeRequire | undefined;

function nodeRequire(): NodeRequire {
  if (typeof __non_webpack_require__ !== "undefined") {
    return __non_webpack_require__;
  }
  return eval("require") as NodeRequire;
}

let patched = false;

function isNodeRuntime(): boolean {
  return typeof process !== "undefined" && Boolean(process.versions?.node);
}

function feedbackRoots(): string[] {
  const cwd = process.cwd();
  const roots = [cwd];
  if (!cwd.endsWith("feedback")) {
    roots.push(join(cwd, "feedback"));
  }
  return roots;
}

function packageRoot(): string {
  for (const root of feedbackRoots()) {
    const candidate = join(root, "node_modules", "@mediapipe", "tasks-vision");
    if (existsSync(join(candidate, "wasm", "vision_wasm_internal.js"))) {
      return candidate;
    }
  }
  return join(process.cwd(), "node_modules", "@mediapipe", "tasks-vision");
}

function mockWebGlClass(name: string): new () => object {
  if (name in globalThis) {
    return globalThis[name as keyof typeof globalThis] as new () => object;
  }
  const Mock = function MockWebGl() {};
  (globalThis as Record<string, unknown>)[name] = Mock;
  return Mock as unknown as new () => object;
}

function loadEmscriptenFactory(preferNosimd = false): () => unknown {
  const file = preferNosimd
    ? "vision_wasm_nosimd_internal.js"
    : "vision_wasm_internal.js";
  const jsPath = join(packageRoot(), "wasm", file);
  const code = readFileSync(jsPath, "utf8");

  const sandbox: Record<string, unknown> = {
    module: { exports: {} as Record<string, unknown> },
    exports: {},
    require: nodeRequire(),
    process,
    __dirname: dirname(jsPath),
    __filename: jsPath,
    global: globalThis,
    self: globalThis,
    console,
    setTimeout,
    clearTimeout,
    TextDecoder: globalThis.TextDecoder,
    TextEncoder: globalThis.TextEncoder,
    WebAssembly: globalThis.WebAssembly,
    performance: globalThis.performance,
    URL: globalThis.URL,
    Buffer: globalThis.Buffer,
    WebGLRenderingContext: mockWebGlClass("WebGLRenderingContext"),
    WebGL2RenderingContext: mockWebGlClass("WebGL2RenderingContext"),
    HTMLCanvasElement: mockWebGlClass("HTMLCanvasElement"),
    HTMLVideoElement: mockWebGlClass("HTMLVideoElement"),
  };
  sandbox.exports = (sandbox.module as { exports: unknown }).exports;

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: jsPath });

  const mod = sandbox.module as { exports: { default?: unknown } & unknown };
  const factory = mod.exports?.default ?? mod.exports;
  if (typeof factory !== "function") {
    throw new Error("MediaPipe WASM factory failed to load");
  }
  return factory as () => unknown;
}

function installDocumentPolyfill(): void {
  if (typeof globalThis.document !== "undefined") return;

  const WebGLCtx = mockWebGlClass("WebGLRenderingContext");
  const WebGL2Ctx = mockWebGlClass("WebGL2RenderingContext");

  function createMockGlContext(preferWebGl2 = false) {
    const ret0 = () => 0;
    const retNull = () => null;
    const retFalse = () => false;
    const retEmpty = () => [] as string[];

    const ctx = Object.create(
      (preferWebGl2 ? WebGL2Ctx : WebGLCtx).prototype
    ) as Record<string, unknown>;

    const methods = [
      "activeTexture", "attachShader", "bindAttribLocation", "bindBuffer",
      "bindFramebuffer", "bindRenderbuffer", "bindTexture", "blendColor",
      "blendEquation", "blendEquationSeparate", "blendFunc", "blendFuncSeparate",
      "bufferData", "bufferSubData", "checkFramebufferStatus", "clear",
      "clearColor", "clearDepth", "clearStencil", "colorMask", "compileShader",
      "copyTexImage2D", "copyTexSubImage2D", "createBuffer", "createFramebuffer",
      "createProgram", "createRenderbuffer", "createShader", "createTexture",
      "cullFace", "deleteBuffer", "deleteFramebuffer", "deleteProgram",
      "deleteRenderbuffer", "deleteShader", "deleteTexture", "depthFunc",
      "depthMask", "depthRange", "detachShader", "disable",
      "disableVertexAttribArray", "drawArrays", "drawElements", "enable",
      "enableVertexAttribArray", "finish", "flush", "framebufferRenderbuffer",
      "framebufferTexture2D", "frontFace", "generateMipmap", "getActiveAttrib",
      "getActiveUniform", "getAttachedShaders", "getAttribLocation",
      "getBufferParameter", "getError", "getFramebufferAttachmentParameter",
      "getProgramInfoLog", "getProgramParameter", "getRenderbufferParameter",
      "getShaderInfoLog", "getShaderParameter", "getShaderPrecisionFormat",
      "getShaderSource", "getTexParameter", "getUniform", "getUniformLocation",
      "getVertexAttrib", "getVertexAttribOffset", "hint", "isBuffer", "isEnabled",
      "isFramebuffer", "isProgram", "isRenderbuffer", "isShader", "isTexture",
      "lineWidth", "linkProgram", "pixelStorei", "polygonOffset", "readPixels",
      "renderbufferStorage", "sampleCoverage", "scissor", "shaderSource",
      "stencilFunc", "stencilFuncSeparate", "stencilMask", "stencilMaskSeparate",
      "stencilOp", "stencilOpSeparate", "texImage2D", "texParameterf",
      "texParameteri", "texSubImage2D", "uniform1f", "uniform1fv", "uniform1i",
      "uniform1iv", "uniform2f", "uniform2fv", "uniform2i", "uniform2iv",
      "uniform3f", "uniform3fv", "uniform3i", "uniform3iv", "uniform4f",
      "uniform4fv", "uniform4i", "uniform4iv", "uniformMatrix2fv",
      "uniformMatrix3fv", "uniformMatrix4fv", "useProgram", "validateProgram",
      "vertexAttrib1f", "vertexAttrib1fv", "vertexAttrib2f", "vertexAttrib2fv",
      "vertexAttrib3f", "vertexAttrib3fv", "vertexAttrib4f", "vertexAttrib4fv",
      "vertexAttribPointer", "viewport",
    ];

    for (const name of methods) {
      ctx[name] =
        name.startsWith("is") || name === "validateProgram" ? retFalse : ret0;
    }

    ctx.getExtension = retNull;
    ctx.getSupportedExtensions = retEmpty;
    ctx.getContextAttributes = () => ({
      alpha: true,
      antialias: true,
      depth: true,
      failIfMajorPerformanceCaveat: false,
      powerPreference: "default",
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      stencil: false,
    });
    ctx.getParameter = (p: number) => (p === 34921 ? 16 : 0);
    ctx.getShaderParameter = () => true;
    ctx.getProgramParameter = () => true;
    ctx.checkFramebufferStatus = () => 36053;
    ctx.getError = ret0;

    return ctx;
  }

  type ScriptEl = {
    crossOrigin: string;
    _listeners: Record<string, Array<() => void>>;
    _url: string;
    addEventListener: (event: string, cb: () => void) => void;
  };

  (globalThis as { document?: unknown }).document = {
    createElement(tag: string) {
      if (tag === "canvas") {
        return {
          width: 0,
          height: 0,
          style: {},
          getContext(type: string) {
            if (type === "webgl2") return createMockGlContext(true);
            if (type === "webgl" || type === "experimental-webgl") {
              return createMockGlContext(false);
            }
            return null;
          },
        };
      }

      if (tag === "div") return { style: {} };
      if (tag !== "script") return {};

      const el: ScriptEl = {
        crossOrigin: "",
        _listeners: {},
        _url: "",
        addEventListener(event, cb) {
          (el._listeners[event] ??= []).push(cb);
        },
      };

      Object.defineProperty(el, "src", {
        configurable: true,
        enumerable: true,
        get() {
          return el._url;
        },
        set(url: string) {
          el._url = url;
        },
      });

      return el;
    },
    body: {
      appendChild(el: ScriptEl) {
        el._listeners.load?.forEach((cb) => cb());
        return el;
      },
    },
  };
}

/** Browser globals MediaPipe expects when running in Node. */
export function ensureMediaPipeServerRuntime(): void {
  if (!isNodeRuntime()) return;

  if (!patched) {
    patched = true;

    if (typeof globalThis.self === "undefined") {
      (globalThis as { self?: typeof globalThis }).self = globalThis;
    }

    installDocumentPolyfill();

    mockWebGlClass("WebGLRenderingContext");
    mockWebGlClass("WebGL2RenderingContext");
    mockWebGlClass("HTMLCanvasElement");
    mockWebGlClass("HTMLVideoElement");
  }

  if (typeof (globalThis as { ModuleFactory?: unknown }).ModuleFactory !== "function") {
    (globalThis as unknown as { ModuleFactory: () => unknown }).ModuleFactory =
      loadEmscriptenFactory(false);
  }
}

/** Local WASM assets — CDN script injection does not work in Node. */
export function getMediaPipeVisionWasmBaseUrl(): string {
  if (!isNodeRuntime()) {
    return "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm";
  }

  ensureMediaPipeServerRuntime();
  return pathToFileURL(join(packageRoot(), "wasm")).href;
}
