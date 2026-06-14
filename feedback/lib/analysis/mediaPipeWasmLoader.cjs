"use strict";

const { join, dirname } = require("path");
const { readFileSync } = require("fs");
const vm = require("vm");
const { pathToFileURL } = require("url");

let patched = false;

function packageRoot() {
  return join(process.cwd(), "node_modules", "@mediapipe", "tasks-vision");
}

function mockWebGlClass(name) {
  if (name in globalThis) return globalThis[name];
  const Mock = function MockWebGl() {};
  globalThis[name] = Mock;
  return Mock;
}

/** @mediapipe/tasks-vision is type:module — require() returns {} not the factory. */
function loadEmscriptenFactory(preferNosimd = false) {
  const file = preferNosimd
    ? "vision_wasm_nosimd_internal.js"
    : "vision_wasm_internal.js";
  const jsPath = join(packageRoot(), "wasm", file);
  const code = readFileSync(jsPath, "utf8");

  const sandbox = {
    module: { exports: {} },
    exports: {},
    require,
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
  sandbox.exports = sandbox.module.exports;

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: jsPath });

  const factory = sandbox.module.exports.default || sandbox.module.exports;
  if (typeof factory !== "function") {
    throw new Error("MediaPipe WASM factory failed to load");
  }
  return factory;
}

function getWasmBaseUrl() {
  return pathToFileURL(join(packageRoot(), "wasm")).href;
}

function installDocumentPolyfill() {
  if (typeof globalThis.document !== "undefined") return;

  const WebGLCtx = mockWebGlClass("WebGLRenderingContext");
  const WebGL2Ctx = mockWebGlClass("WebGL2RenderingContext");

  function createMockGlContext(preferWebGl2 = false) {
    const noop = () => {};
    const ret0 = () => 0;
    const retNull = () => null;
    const retFalse = () => false;
    const retEmpty = () => [];

    const ctx = Object.create(
      (preferWebGl2 ? WebGL2Ctx : WebGLCtx).prototype
    );
    const methods = [
      "activeTexture",
      "attachShader",
      "bindAttribLocation",
      "bindBuffer",
      "bindFramebuffer",
      "bindRenderbuffer",
      "bindTexture",
      "blendColor",
      "blendEquation",
      "blendEquationSeparate",
      "blendFunc",
      "blendFuncSeparate",
      "bufferData",
      "bufferSubData",
      "checkFramebufferStatus",
      "clear",
      "clearColor",
      "clearDepth",
      "clearStencil",
      "colorMask",
      "compileShader",
      "copyTexImage2D",
      "copyTexSubImage2D",
      "createBuffer",
      "createFramebuffer",
      "createProgram",
      "createRenderbuffer",
      "createShader",
      "createTexture",
      "cullFace",
      "deleteBuffer",
      "deleteFramebuffer",
      "deleteProgram",
      "deleteRenderbuffer",
      "deleteShader",
      "deleteTexture",
      "depthFunc",
      "depthMask",
      "depthRange",
      "detachShader",
      "disable",
      "disableVertexAttribArray",
      "drawArrays",
      "drawElements",
      "enable",
      "enableVertexAttribArray",
      "finish",
      "flush",
      "framebufferRenderbuffer",
      "framebufferTexture2D",
      "frontFace",
      "generateMipmap",
      "getActiveAttrib",
      "getActiveUniform",
      "getAttachedShaders",
      "getAttribLocation",
      "getBufferParameter",
      "getError",
      "getFramebufferAttachmentParameter",
      "getProgramInfoLog",
      "getProgramParameter",
      "getRenderbufferParameter",
      "getShaderInfoLog",
      "getShaderParameter",
      "getShaderPrecisionFormat",
      "getShaderSource",
      "getTexParameter",
      "getUniform",
      "getUniformLocation",
      "getVertexAttrib",
      "getVertexAttribOffset",
      "hint",
      "isBuffer",
      "isEnabled",
      "isFramebuffer",
      "isProgram",
      "isRenderbuffer",
      "isShader",
      "isTexture",
      "lineWidth",
      "linkProgram",
      "pixelStorei",
      "polygonOffset",
      "readPixels",
      "renderbufferStorage",
      "sampleCoverage",
      "scissor",
      "shaderSource",
      "stencilFunc",
      "stencilFuncSeparate",
      "stencilMask",
      "stencilMaskSeparate",
      "stencilOp",
      "stencilOpSeparate",
      "texImage2D",
      "texParameterf",
      "texParameteri",
      "texSubImage2D",
      "uniform1f",
      "uniform1fv",
      "uniform1i",
      "uniform1iv",
      "uniform2f",
      "uniform2fv",
      "uniform2i",
      "uniform2iv",
      "uniform3f",
      "uniform3fv",
      "uniform3i",
      "uniform3iv",
      "uniform4f",
      "uniform4fv",
      "uniform4i",
      "uniform4iv",
      "uniformMatrix2fv",
      "uniformMatrix3fv",
      "uniformMatrix4fv",
      "useProgram",
      "validateProgram",
      "vertexAttrib1f",
      "vertexAttrib1fv",
      "vertexAttrib2f",
      "vertexAttrib2fv",
      "vertexAttrib3f",
      "vertexAttrib3fv",
      "vertexAttrib4f",
      "vertexAttrib4fv",
      "vertexAttribPointer",
      "viewport",
    ];

    for (const name of methods) {
      ctx[name] = name.startsWith("is") || name === "validateProgram" ? retFalse : ret0;
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
    ctx.getParameter = (p) => (p === 34921 ? 16 : 0); // MAX_VERTEX_ATTRIBS
    ctx.getShaderParameter = () => true;
    ctx.getProgramParameter = () => true;
    ctx.checkFramebufferStatus = () => 36053; // FRAMEBUFFER_COMPLETE
    ctx.getError = ret0;

    return ctx;
  }

  globalThis.document = {
    createElement(tag) {
      if (tag === "canvas") {
        return {
          width: 0,
          height: 0,
          style: {},
          getContext(type) {
            if (type === "webgl2") {
              return createMockGlContext(true);
            }
            if (type === "webgl" || type === "experimental-webgl") {
              return createMockGlContext(false);
            }
            return null;
          },
        };
      }

      if (tag === "div") {
        return { style: {} };
      }

      if (tag !== "script") {
        return {};
      }

      const el = {
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
        set(url) {
          el._url = url;
        },
      });

      return el;
    },
    body: {
      appendChild(el) {
        // ModuleFactory is preloaded via vm — script injection is a no-op.
        el._listeners.load?.forEach((cb) => cb());
        return el;
      },
    },
  };
}

/** Browser globals MediaPipe expects when running in Node. */
function prepareServerRuntime() {
  if (patched) return;
  patched = true;

  if (typeof globalThis.self === "undefined") {
    globalThis.self = globalThis;
  }

  installDocumentPolyfill();

  mockWebGlClass("WebGLRenderingContext");
  mockWebGlClass("WebGL2RenderingContext");
  mockWebGlClass("HTMLCanvasElement");
  mockWebGlClass("HTMLVideoElement");

  if (typeof globalThis.ModuleFactory !== "function") {
    globalThis.ModuleFactory = loadEmscriptenFactory(false);
  }
}

module.exports = { getWasmBaseUrl, prepareServerRuntime };
