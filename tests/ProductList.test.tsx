import { screen } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { describe, it } from "vitest";
import ProductList from "../src/components/ProductList";
import { initialProducts } from "../src/mocks/handlers";
import { server } from "../src/mocks/server";
import { renderWithProviders } from "./renderWithProviders";

describe("ProductList", () => {
  const renderComponent = () => {
    renderWithProviders(<ProductList />);
  };
  // TICKET 2.1
  it("shows the loading state while products are loading", () => {
    // simulate fetching products from the API with a delay of 100ms
    //! MSW-Handler müssen immer VOR render() registriert werden.
    server.use(
      http.get("/api/products", async () => {
        await delay(100); //simulate delay of 100 ms to test loading state
        return HttpResponse.json([]);
      }),
    );
    renderComponent();
    expect(screen.getByRole("status")).toHaveTextContent(/loading/i);
  });

  // TICKET 2.2
  it("renders products returned by the API", async () => {
    const products = initialProducts;
    //! MSW-Handler müssen immer VOR render() registriert werden.
    server.use(
      http.get("/api/products/", () => {
        return HttpResponse.json(products);
      }),
    );
    renderWithProviders(<ProductList />);
    // await waitForElementToBeRemoved(() => screen.getByRole("status"));(findByText in der for loop wartet bereits drauf, dass die Products geladen und gerendert werden)

    for (const product of products) {
      expect(await screen.findByText(product.name)).toBeInTheDocument();

      expect(
        await screen.findByText(new RegExp(product.price.toString())),
      ).toBeInTheDocument(); //access to product price needs new RegExp wrapper to match the string
    }
  });

  // TICKET 2.3
  it("shows the empty state when the API returns no products", async () => {
    //! MSW-Handler müssen immer VOR render() registriert werden.
    server.use(http.get("/api/products", () => HttpResponse.json([])));
    renderWithProviders(<ProductList />);

    expect(await screen.findByText("No products found.")).toBeInTheDocument();
  });

  // TICKET 2.4
  it("shows an error when loading products fails", async () => {
    //! MSW-Handler müssen immer VOR render() registriert werden.

    server.use(http.get("/api/products", () => HttpResponse.error()));

    renderWithProviders(<ProductList />);
    // findByRole und nicht getByRole, da state update nach dem Error -> re-render
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /could not load products/i,
    );
  });

  /*  {status: 400, message: "Bad Request"},
    {status: 401, message: "Unauthorized"},
    {status: 403, message: "Forbidden"},
    {status: 404, message: "Not Found"},
    {status: 500, message: "Internal Server Error"} */

  // TICKET 2.5
  it.each([
    { status: 400, message: "Invalid  Request" },
    { status: 404, message: "Product not Found" },
    { status: 500, message: "Server Error" },
  ])(
    "show an error message for http status $status",
    async ({ status, message }) => {
      //! MSW-Handler müssen immer VOR render() registriert werden.
      server.use(
        http.get("/api/products", () =>
          HttpResponse.json({ message }, { status }),
        ),
      );

      renderWithProviders(<ProductList />);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        /could not load products/i,
      );
    },
  );
});
