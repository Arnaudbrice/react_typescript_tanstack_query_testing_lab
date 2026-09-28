import { QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { createQueryClient } from "../src/lib/queryClient";

export function renderWithProviders(
  ui: ReactElement, //for example a component

  queryClient = createQueryClient(),
) {
  // const queryClient = createQueryClient();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  /* render(ui, { wrapper: Wrapper }) wird von renderWithProviders() aufgerufen,dann wird das Ergebnis als Object zurückgegeben, die bei Bedarf in den Tests verwendet werden kann ({
  queryClient,
  container,
  rerender,
  unmount,
  debug,
  ...
})*/
  return {
    queryClient,
    ...render(ui, { wrapper: Wrapper }),
  };
}
