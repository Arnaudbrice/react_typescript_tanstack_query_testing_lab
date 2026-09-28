import type { CreateProductInput, Product } from "../types/product";

const API_URL = "/api/products";

export async function getProducts(): Promise<Product[]> {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error("Failed to load products");
  }

  return response.json() as Promise<Product[]>;
}

/* -createProduct(input) → Promise<Product> (Ergebnis in einer Promise gepackt)
-await createProduct(input)  → Product-Objekt */
export async function createProduct(
  input: CreateProductInput,
): Promise<Product> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to create product");
  }

  return response.json() as Promise<Product>;
}
