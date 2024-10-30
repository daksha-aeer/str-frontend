import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// import util from "util";
// import buffer from "buffer";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: {},
    // "process.env": process.env,
    // "util.debuglog": util.debuglog,
    // "buffer.Buffer": buffer.Buffer,
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: "globalThis",
      },
      // Enable esbuild polyfill plugins
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true,
        }),
      ],
    },
  },
  // unnecessary- resolved by NodeGlobalsPolyfillPlugin
  // resolve: {
  //   alias: {
  //     process: "process",
  //     buffer: "buffer",
  //     // crypto: "crypto-browserify",
  //     // stream: "stream-browserify",
  //     // assert: "assert",
  //     http: "stream-http",
  //     https: "https-browserify",
  //     // os: "os-browserify",
  //     // url: "url",
  //     util: "util",
  //   },
  // },
});
