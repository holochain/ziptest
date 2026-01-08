import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { version, dnaVersion } from "./package.json"; // Import version from package.json
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // Relative paths for static hosting
  plugins: [
    svelte(),
    viteStaticCopy({
      targets: [
        {
          src: "icon.png",
          dest: ".",
        },
      ],
    }),
  ],
  server: {
    hmr: {
      host: "localhost",
    },
    watch: {
      usePolling: true,
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(version), // Define a global constant
    __DNA_VERSION__: JSON.stringify(dnaVersion), // Define a global constant
    __GATEWAY_URL__: JSON.stringify(process.env.GATEWAY_URL || 'http://localhost:8000'),
  },
});
