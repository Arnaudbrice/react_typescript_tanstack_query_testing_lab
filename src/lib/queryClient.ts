import { QueryCache, QueryClient } from "@tanstack/react-query";

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      // central error handling for all queries in the app
      onError: (error) => {
        console.error("Query failed:", error.message);
      },
    }),
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
