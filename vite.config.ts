import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";
import type { IncomingMessage, ServerResponse } from "node:http";

function devProductsApi(): Plugin {
  let products = [
    { id: 1, name: "Mechanical Keyboard", price: 129.99, category: "Electronics" },
    { id: 2, name: "TypeScript Handbook", price: 39.9, category: "Books" },
  ];

  return {
    name: "dev-products-api",
    configureServer(server) {
      server.middlewares.use("/api/products", async (req: IncomingMessage, res: ServerResponse) => {
        res.setHeader("Content-Type", "application/json");

        if (req.method === "GET") {
          res.statusCode = 200;
          res.end(JSON.stringify(products));
          return;
        }

        if (req.method === "POST") {
          let body = "";
          for await (const chunk of req) body += chunk;

          const input = JSON.parse(body) as {
            name: string;
            price: number;
            category: string;
          };

          const product = {
            id: products.length + 1,
            ...input,
          };

          products = [...products, product];
          res.statusCode = 201;
          res.end(JSON.stringify(product));
          return;
        }

        res.statusCode = 405;
        res.end(JSON.stringify({ message: "Method not allowed" }));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devProductsApi()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/testSetup.ts",
    globals: true,
    css: true,
    restoreMocks: true,
    clearMocks: true,
  },
});
