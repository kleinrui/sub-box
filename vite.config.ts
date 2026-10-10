import { cloudflare } from "@cloudflare/vite-plugin";
import vinext from "vinext";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    dedupe: ["react", "react-dom", "@tanstack/react-query"],
  },
  plugins: [
    {
      name: "api-docs-utf8",
      configureServer(server) {
        // Vite 的本地静态服务不读取 Cloudflare public/_headers。
        server.middlewares.use((req, res, next) => {
          const path = req.url?.split("?")[0];
          if (path === "/llms.txt" || path === "/llms-full.txt") {
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
          } else if (path?.startsWith("/api/docs/") && path.endsWith(".md")) {
            res.setHeader("Content-Type", "text/markdown; charset=utf-8");
          }
          next();
        });
      },
    },
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
