import { http, HttpResponse, delay } from "msw";
import type { CreateProductInput, Product } from "../types/product";

export const initialProducts: Product[] = [
  {
    id: 1,
    name: "Mechanical Keyboard",
    price: 129.99,
    category: "Electronics",
  },
  { id: 2, name: "TypeScript Handbook", price: 39.9, category: "Books" },
];

let products = [...initialProducts];

export function resetProducts() {
  products = [...initialProducts];
}

export const handlers = [
  http.get("/api/products", async () => {
    await delay(80);
    return HttpResponse.json(products);
  }),

  http.post("/api/products", async ({ request }) => {
    await delay(80);
    const input = (await request.json()) as CreateProductInput;

    const product: Product = {
      id: products.length + 1,
      ...input,
    };

    products.push(product);
    return HttpResponse.json(product, { status: 201 });
  }),
];
