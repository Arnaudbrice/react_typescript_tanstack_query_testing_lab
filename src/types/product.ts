export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

export interface CreateProductInput {
  name: string;
  price: number;
  category: string;
}
