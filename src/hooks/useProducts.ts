import { useQuery } from "@tanstack/react-query";
import { getProducts } from "../api/products";

export const productKeys = {
  // mit as const
  // readonly ["products"]
  all: ["products"] as const,
};

export default function useProducts() {
  return useQuery({
    queryKey: productKeys.all,
    queryFn: getProducts,
    staleTime: 30_000, // 30 seconds
  });
}
