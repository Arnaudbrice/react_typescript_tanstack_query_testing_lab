import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProductList from "../src/components/ProductList";
import { renderWithProviders } from "./renderWithProviders";

describe("test setup", () => {
  it("renders the product list after the API responds", async () => {
    renderWithProviders(<ProductList />);

    //if we don't redefine the msw handlers, their will be called before the renderWithProviders function is called per default

    expect(await screen.findByText("Mechanical Keyboard")).toBeInTheDocument();
  });
});
