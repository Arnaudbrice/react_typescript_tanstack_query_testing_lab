import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, it } from "vitest";
import { getProducts } from "../src/api/products";
import App from "../src/App";
import ProductList from "../src/components/ProductList";
import { productKeys } from "../src/hooks/useProducts";
import { createQueryClient } from "../src/lib/queryClient";
import { initialProducts } from "../src/mocks/handlers";
import { server } from "../src/mocks/server";
import { CreateProductInput, Product } from "../src/types/product";
import { renderWithProviders } from "./renderWithProviders";
import { QueryClient } from "@tanstack/react-query";

// !important
/* server.use(...)
→ Handler synchron registriert ✅

renderWithProviders(...)
→ ProductList rendert
→ useQuery startet queryFn
→ getProducts()
→ fetch("/api/products")       ← asynchron
→ MSW fängt Request ab
→ Handler liefert Response
→ response.json()
→ TanStack Query bekommt Daten
→ Cache wird aktualisiert
→ ProductList Re-Render
→ "laptop" erscheint */

describe("product query cache", () => {
  // TICKET 2.10 (cache isolation between tests)
  it("shows only products from the first test", async () => {
    server.use(
      http.get("/api/products", () => {
        const products = [
          { id: 1, name: "computer", price: 1000, category: "Electronics" },
        ];

        return HttpResponse.json(products);
      }),
    );

    renderWithProviders(<ProductList />);

    expect(await screen.findByText("computer")).toBeInTheDocument();
    expect(screen.getByText(/1000/)).toBeInTheDocument();
  });

  it("should not reuse cached products data from the previous test", async () => {
    server.use(
      http.get("/api/products", () => {
        const products = [
          { id: 2, name: "laptop", price: 2000, category: "Electronics" },
        ];

        return HttpResponse.json(products);
      }),
    );

    renderWithProviders(<ProductList />);

    expect(await screen.findByText("laptop")).toBeInTheDocument();
    expect(screen.getByText(/2000/)).toBeInTheDocument();
    // !important
    expect(screen.queryByText("computer")).not.toBeInTheDocument();
  });

  // BONUS 2.11
  it("prefetches products before ProductList mounts", async () => {
    const queryClient = createQueryClient();
    await queryClient.prefetchQuery({
      queryKey: ["products"],
      queryFn: getProducts,
    });

    // Note:msw handlers from handlers.ts are called when getProducts() is called to intercept the request and return the response
    const products = queryClient.getQueryData<Product[]>(["products"]) || [];
    console.log("products", products);

    // assert the cache contents data after prefetching
    expect(products).toHaveLength(initialProducts.length);
    //! render the component with the queryClient that already a cache with products
    renderWithProviders(<ProductList />, queryClient);

    for (const product of products) {
      expect(screen.getByText(product.name)).toBeInTheDocument();
      expect(
        screen.getByText(new RegExp(product.price.toString())),
      ).toBeInTheDocument();
    }
  });

  // BONUS 2.12
  /*   it("updates the products cache with setQueryData without a second GET request", async () => {
    let getRequestCount = 0;
    server.use(
      http.get("/api/products", () => {
        getRequestCount++;
        return HttpResponse.json(initialProducts);
      }),
    );

    const queryClient = createQueryClient();

    await queryClient.prefetchQuery({
      queryKey: ["products"],
      queryFn: getProducts,
    });

    expect(getRequestCount).toBe(1);
    //! render the component with a queryClient that contains a query with products into the cache
    renderWithProviders(<ProductList />, queryClient);

    const input: Product = {
      id: 3,
      name: "tablet",
      price: 100,
      category: "Electronics",
    };

    queryClient.setQueryData<Product[]>(["products"], (oldProducts = []) => [
      ...oldProducts,
      input,
    ]);

    const allProducts = queryClient.getQueryData<Product[]>(["products"]) || [];

    console.log("allProducts", allProducts);
    for (const product of allProducts) {
      expect(
        await screen.findByText(new RegExp(product.name)),
      ).toBeInTheDocument();
      expect(
        screen.getByText(new RegExp(product.price.toString())),
      ).toBeInTheDocument();
    }

    expect(getRequestCount).toBe(1);
  }); */
  it.skip("updates the products cache with setQueryData without a second GET request", async () => {
    let getRequestCount = 0;
    let postRequestCount = 0;

    let products = [...initialProducts];
    server.use(
      http.get("/api/products", () => {
        getRequestCount++;
        return HttpResponse.json(initialProducts);
      }),
    );

    server.use(
      http.post("/api/products", async ({ request }) => {
        postRequestCount++;
        const input = (await request.json()) as CreateProductInput;

        const product: Product = {
          id: products.length + 1,
          ...input,
        };

        products.push(product);
        return HttpResponse.json(product, { status: 201 });
      }),
    );

    //! render the component with a queryClient that contains a query with products into the cache
    renderWithProviders(<App />);

    expect(await screen.findByText("Mechanical Keyboard")).toBeInTheDocument();
    expect(getRequestCount).toBe(1);
    const user = userEvent.setup();
    let button = screen.getByRole("button", { name: /add product/i });

    const inputName = screen.getByLabelText(/name/i);
    const inputPrice = screen.getByLabelText(/price/i);
    const inputCategory = screen.getByRole("combobox");

    await user.type(inputName, "tablet");
    await user.type(inputPrice, "100");
    await user.selectOptions(inputCategory, "Electronics");
    await user.click(button);

    expect(await screen.findByText("tablet")).toBeInTheDocument();
    expect(screen.getByText(/100/)).toBeInTheDocument();

    expect(getRequestCount).toBe(1);
    expect(postRequestCount).toBe(1);
  });

  //********** 2.13 (Integration/UI-Test: Produkt erscheint optimistisch) **********
  // !integration test (App component is rendered)
  it("should render the posted product while the post request is pending", async () => {
    const user = userEvent.setup();
    let resolvePromise!: () => void;

    const pendingPromise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    server.use(
      http.post("/api/products", async ({ request }) => {
        const parsedBody = (await request.json()) as CreateProductInput; //turn the request body into a JS object
        await pendingPromise; //! Request bleibt pending, bis wir ihn im Test auflösen (dafür muss nur resolvePromise() aufgerufen werden)
        return HttpResponse.json({
          id: 3,
          ...parsedBody,
        });
      }),
    );

    renderWithProviders(<App />);

    const nameInput = screen.getByLabelText(/name/i);
    const priceInput = screen.getByLabelText(/price/i);
    const categoryInput = screen.getByRole("combobox");
    let button = screen.getByRole("button", { name: /add product/i });

    await user.type(nameInput, "tablet");
    await user.type(priceInput, "100");
    await user.selectOptions(categoryInput, "Electronics");
    await user.click(button);
    button = await screen.findByRole("button", { name: /saving/i });
    expect(button).toBeDisabled();
    expect(await screen.findByText("tablet")).toBeInTheDocument();
    expect(screen.getByText(/100/)).toBeInTheDocument();

    resolvePromise();
    button = await screen.findByRole("button", { name: /add product/i });
    expect(button).toBeEnabled();
  });

  //********** 2.14 (Integration/UI-Test: Fehler führt zum Rollback) **********
  it("rolls back the optimistic product when the request fails", async () => {
    // deine Implementierung

    const user = userEvent.setup();

    let resolvedRequest!: () => void;

    const pendingPromise = new Promise<void>((resolve) => {
      resolvedRequest = resolve;
    });

    server.use(
      http.post("/api/products", async ({ request }) => {
        await pendingPromise;

        return HttpResponse.json(
          {
            message: "Server Error",
          },
          { status: 500 },
        );
      }),
    );

    renderWithProviders(<App />);

    const nameInput = screen.getByLabelText(/name/i);

    const priceInput = screen.getByLabelText(/price/i);

    const categoryInput = screen.getByRole("combobox");
    let button = screen.getByRole("button", { name: /add product/i });

    await user.type(nameInput, "tablet");
    await user.type(priceInput, "100");

    await user.selectOptions(categoryInput, "Electronics");
    await user.click(button);
    button = await screen.findByRole("button", { name: /saving/i });
    expect(button).toBeDisabled();
    expect(await screen.findByText("tablet")).toBeInTheDocument();

    resolvedRequest();

    await waitFor(() => {
      expect(screen.queryByText("tablet")).not.toBeInTheDocument();
    });
    button = await screen.findByRole("button", { name: /add product/i });
    expect(button).toBeEnabled();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Product could not be saved/i,
    );
  });

  //********** 2.15 (Integration Test:onSettled verursacht Refetch) **********
  it("refetches products after a failed mutation settles", async () => {
    const user = userEvent.setup();
    let resolveRequest!: () => void;
    const pendingPromise = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });

    let getRequestCount = 0;
    server.use(
      http.get("/api/products", () => {
        const products = [...initialProducts];
        getRequestCount++;
        return HttpResponse.json(products);
      }),
    );

    server.use(
      http.post("/api/products", async () => {
        await pendingPromise;

        return HttpResponse.json(
          {
            message: "server error",
          },
          {
            status: 500,
          },
        );
      }),
    );

    renderWithProviders(<App />);

    expect(await screen.findByText(/Mechanical Keyboard/i)).toBeInTheDocument();
    expect(await screen.findByText(/TypeScript Handbook/i)).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/name/i);
    const priceInput = screen.getByLabelText(/price/i);
    const categoryInput = screen.getByRole("combobox", { name: /category/i });

    let button = screen.getByRole("button", { name: /add product/i });

    await user.type(nameInput, "tablet");
    await user.type(priceInput, "100");
    await user.selectOptions(categoryInput, "Electronics");

    await user.click(button);

    button = await screen.findByRole("button", { name: /saving/i });

    expect(button).toBeDisabled();
    expect(await screen.findByText(/tablet/i)).toBeInTheDocument();

    resolveRequest();
    // warten bis tablet verschwindet (onError → Rollback )
    await waitFor(() => {
      expect(screen.queryByText(/tablet/i)).not.toBeInTheDocument();
    });
    // wartet bis neue Products geladen werden (onSettled →invalidateQueries →Refetch )
    await waitFor(() => {
      expect(getRequestCount).toBe(2);
    });

    button = await screen.findByRole("button", { name: /add product/i });

    expect(button).toBeEnabled();
  });

  //********** 2.16 Integration Test: Optimistischer Product wird im Cache gespeichert ********

  it("stores a temporary product in the cache while the mutation is pending", async () => {
    const user = userEvent.setup();
    let resolveRequest!: () => void;
    const pendingPromise = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });

    //! Wenn ein MSW-Test mehrere zusammenhängende Requests simuliert (POST → GET), müssen die Handler einen konsistenten Serverzustand abbilden.
    let serverProducts = [...initialProducts];

    server.use(
      http.get("/api/products", () => {
        return HttpResponse.json(serverProducts);
      }),
    );

    server.use(
      http.post("/api/products", async ({ request }) => {
        const product = (await request.json()) as CreateProductInput;
        await pendingPromise;
        const newProduct: Product = {
          id: 3,
          ...product,
        };

        //! nach dem erfolgreichen POST wird das neue Produkt im Cache gespeichert und serverProducts aktualisiert
        serverProducts.push(newProduct);
        return HttpResponse.json(newProduct, { status: 201 });
      }),
    );

    const { queryClient } = renderWithProviders(<App />);

    expect(await screen.findByText(/Mechanical Keyboard/i)).toBeInTheDocument();
    expect(await screen.findByText(/TypeScript Handbook/i)).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/name/i);
    const priceInput = screen.getByLabelText(/price/i);
    const categoryInput = screen.getByRole("combobox", { name: /category/i });

    let button = screen.getByRole("button", { name: /add product/i });

    await user.type(nameInput, "tablet");
    await user.type(priceInput, "100");
    await user.selectOptions(categoryInput, "Electronics");

    await user.click(button);

    button = await screen.findByRole("button", { name: /saving/i });

    expect(button).toBeDisabled();
    expect(await screen.findByText(/tablet/i)).toBeInTheDocument();

    const products = queryClient.getQueryData<Product[]>(productKeys.all) || [];

    const productWithOptimisticId = products.find(
      (product) => product.name === "tablet",
    );
    expect(productWithOptimisticId).toBeDefined();
    expect(productWithOptimisticId?.price).toBe(100);
    expect(productWithOptimisticId?.category).toBe("Electronics");
    expect(productWithOptimisticId?.id).toBeLessThan(0);

    resolveRequest();

    //! warten bis das Tablet die id 3 hat
    await waitFor(() => {
      const newProducts =
        queryClient.getQueryData<Product[]>(productKeys.all) ?? [];

      const productWithOptimisticIdUpdated = newProducts.find(
        (product) => product.name === "tablet",
      );

      expect(productWithOptimisticIdUpdated?.id).toBe(3);
    });

    expect(await screen.findByText(/tablet/i)).toBeInTheDocument();
  });

  it("retries a failed mutation once and succeeds on the second attempt", async () => {
    const user = userEvent.setup();

    let resolvePostRequest!: () => void;
    const pendingPromise = new Promise<void>((resolve) => {
      resolvePostRequest = resolve;
    });
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: 1,
          retryDelay: 0,
        },
      },
    });

    let postRequestCount = 0;
    server.use(
      http.post("/api/products", async ({ request }) => {
        postRequestCount++;
        if (postRequestCount === 1) {
          return HttpResponse.json(
            {
              message: "server error",
            },
            {
              status: 500,
            },
          );
        }

        const product = (await request.json()) as CreateProductInput;

        await pendingPromise; // auf den zweiten Versuch warten
        return HttpResponse.json({
          id: 3,
          ...product,
        });
      }),
    );
    renderWithProviders(<App />, queryClient);
    expect(await screen.findByText(/Mechanical Keyboard/i)).toBeInTheDocument();
    expect(await screen.findByText(/TypeScript Handbook/i)).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/name/i);
    const priceInput = screen.getByLabelText(/price/i);

    const categoryInput = screen.getByRole("combobox", { name: /category/i });

    let button = screen.getByRole("button", { name: /add product/i });

    await user.type(nameInput, "tablet");
    await user.type(priceInput, "100");
    await user.selectOptions(categoryInput, "Electronics");
    await user.click(button);

    button = await screen.findByRole("button", { name: /saving/i });
    expect(button).toBeDisabled();
    // Wirklich auf den async zweiten POST warten.
    await waitFor(() => {
      expect(postRequestCount).toBe(2);
    });

    // tablet is optimistic and should be rendered
    expect(screen.getByText(/tablet/i)).toBeInTheDocument();

    resolvePostRequest(); //continue with the second POST request

    // the form should be cleared after a successful mutation, and the button should be enabled again
    button = await screen.findByRole("button", { name: /add product/i });

    // auf der erfolgsreichen Mutation warten (async mutation.mutateAsync)

    expect(button).toBeEnabled();
    expect(nameInput).toHaveValue("");
    expect(priceInput).toHaveValue(null);
  });

  it("rolls back the optimistic update after all mutation attempts fail", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: 1,
          retryDelay: 0,
        },
      },
    });

    let resolvePending!: () => void;

    const pendingPromise = new Promise<void>((resolve) => {
      resolvePending = resolve;
    });

    let postRequestCount = 0;

    server.use(
      http.post("/api/products", async ({ request }) => {
        postRequestCount++;
        if (postRequestCount === 1) {
          return HttpResponse.json(
            {
              message: "server error",
            },
            { status: 500 },
          );
        }

        await pendingPromise;

        return HttpResponse.json(
          {
            message: "server error",
          },
          { status: 500 },
        );
      }),
    );

    renderWithProviders(<App />, queryClient);

    const nameInput = screen.getByLabelText(/name/i);
    const priceInput = screen.getByLabelText(/price/i);
    const categoryInput = screen.getByRole("combobox", { name: /category/i });

    let button = screen.getByRole("button", { name: /add product/i });

    await user.type(nameInput, "tablet");
    await user.type(priceInput, "100");
    await user.selectOptions(categoryInput, "Electronics");
    await user.click(button);

    await waitFor(() => {
      expect(postRequestCount).toBe(2);
    });

    expect(screen.getByText(/tablet/i)).toBeInTheDocument();
    button = screen.getByRole("button", { name: /saving/i });
    expect(button).toBeDisabled();

    resolvePending();
    // wait for the optimistic update to be rolled back
    await waitFor(() => {
      expect(screen.queryByText(/tablet/i)).not.toBeInTheDocument();
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Product could not be saved/i,
    );
    button = await screen.findByRole("button", { name: /add product/i });
    expect(button).toBeEnabled();

    expect(postRequestCount).toBe(2);
  });

  // in-flight ≈ pending
  it("prevents an in-flight products query from overwriting the optimistic update ", async () => {
    const user = userEvent.setup();

    let resolveSecondGetRequest!: () => void;
    const secondGetRequestPromise = new Promise<void>((resolve) => {
      resolveSecondGetRequest = resolve;
    });

    let getRequestCount = 0;
    let secondGetCompleted = false;

    const allProducts = [...initialProducts];

    server.use(
      http.get("/api/products", async () => {
        getRequestCount++;
        const products = [...allProducts];

        if (getRequestCount === 1) {
          return HttpResponse.json(products);
        }

        await secondGetRequestPromise;
        secondGetCompleted = true;

        return HttpResponse.json(products);
      }),
    );

    let resolvePostRequest!: () => void;
    const postRequestPromise = new Promise<void>((resolve) => {
      resolvePostRequest = resolve;
    });

    server.use(
      http.post("/api/products", async ({ request }) => {
        const product = (await request.json()) as CreateProductInput;

        const newProduct: Product = { id: 3, ...product };

        await postRequestPromise;
        allProducts.push(newProduct);
        return HttpResponse.json(newProduct, { status: 201 });
      }),
    );

    const { queryClient } = renderWithProviders(<App />);

    expect(await screen.findByText(/Mechanical Keyboard/i)).toBeInTheDocument();
    expect(await screen.findByText(/TypeScript Handbook/i)).toBeInTheDocument();

    // Wir wollen nicht auf das Ende der Invalidierung warten, denn GET #2 soll ja gerade pending bleiben.
    void queryClient.invalidateQueries({
      queryKey: productKeys.all,
    });

    await waitFor(() => {
      expect(getRequestCount).toBe(2);
    });

    const nameInput = screen.getByLabelText(/name/i);
    const priceInput = screen.getByLabelText(/price/i);
    const categoryInput = screen.getByRole("combobox", { name: /category/i });

    let button = screen.getByRole("button", { name: /add product/i });

    await user.type(nameInput, "tablet");
    await user.type(priceInput, "100");
    await user.selectOptions(categoryInput, "Electronics");
    await user.click(button);

    button = await screen.findByRole("button", { name: /saving/i });
    expect(button).toBeDisabled();

    expect(await screen.findByText(/tablet/i)).toBeInTheDocument();

    resolveSecondGetRequest();
    await waitFor(() => {
      expect(secondGetCompleted).toBe(true);
    });

    expect(screen.getByText(/tablet/i)).toBeInTheDocument();

    resolvePostRequest();

    expect(
      await screen.findByRole("button", { name: /add product/i }),
    ).toBeEnabled();
  });

  it("keeps the form values when creating a product fails", async () => {
    // userEvent

    const user = userEvent.setup();

    // POST → 500

    server.use(
      http.post("/api/products", () => {
        // body

        return HttpResponse.json({ message: "Server Error" }, { status: 500 });
      }),
    );

    // render App

    renderWithProviders(<App />);

    // warten bis initiale Products geladen sind
    expect(await screen.findByText(/Mechanical Keyboard/i)).toBeInTheDocument();
    expect(screen.getByText(/TypeScript Handbook/i)).toBeInTheDocument();

    // Inputs holen

    const nameInput = screen.getByLabelText(/name/i);
    const priceInput = screen.getByLabelText(/price/i);
    const categoryInput = screen.getByRole("combobox", { name: /category/i });

    // Name: tablet
    // Price: 100
    // Category: Electronics

    await user.type(nameInput, "tablet");
    await user.type(priceInput, "100");
    await user.selectOptions(categoryInput, "Electronics");

    // Add product klicken

    let button = screen.getByRole("button", { name: /add product/i });

    await user.click(button);

    // NOCH KEINE Assertions zum Fehler
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Product could not be saved/i,
    );
    expect(screen.getByLabelText(/name/i)).toHaveValue("tablet");
    expect(screen.getByLabelText(/price/i)).toHaveValue(100);
    expect(screen.getByRole("combobox")).toHaveValue("Electronics");

    await waitFor(() => {
      expect(screen.queryByText(/tablet/i)).not.toBeInTheDocument();
    });
  });

  it("should update the cache with Changes from server after rollback of optimistic update", async () => {
    const user = userEvent.setup();
    let getRequestCount = 0;

    server.use(
      http.get("/api/products", () => {
        // Counter erhöhen
        getRequestCount++;

        // GET #1:

        if (getRequestCount === 1) {
          return HttpResponse.json(initialProducts);
        }
        // initialProducts zurückgeben
        // ab GET #2:
        // serverProducts zurückgeben
        return HttpResponse.json([
          ...initialProducts,
          {
            id: 3,
            name: "Monitor",
            price: 100,
            category: "Electronics",
          },
        ]);
      }),
    );

    server.use(
      http.post("/api/products", () => {
        return HttpResponse.json(
          {
            message: "Server Error",
          },
          { status: 500 },
        );
      }),
    );

    renderWithProviders(<App />);

    expect(await screen.findByText(/Mechanical Keyboard/i)).toBeInTheDocument();
    expect(await screen.findByText(/TypeScript Handbook/i)).toBeInTheDocument();
    expect(screen.queryByText(/monitor/i)).not.toBeInTheDocument();

    const nameInput = screen.getByLabelText(/name/i);

    const priceInput = screen.getByLabelText(/price/i);

    const selectInput = screen.getByRole("combobox", { name: /category/i });
    let button = screen.getByRole("button", { name: /add product/i });

    await user.type(nameInput, "tablet");
    await user.type(priceInput, "100");
    await user.selectOptions(selectInput, "Electronics");

    await user.click(button);

    expect(await screen.findByText(/monitor/i)).toBeInTheDocument();
    // monitor is displayed means getRequestCount is 2
    expect(getRequestCount).toBe(2);
    expect(screen.queryByText(/tablet/i)).not.toBeInTheDocument();
  });

  it("should fetch products once", async () => {
    let getRequestCount = 0;

    server.use(
      http.get("/api/products", () => {
        getRequestCount++;

        return HttpResponse.json(initialProducts);
      }),
    );

    const { queryClient, unmount } = renderWithProviders(<ProductList />);

    expect(await screen.findByText(/Mechanical Keyboard/i)).toBeInTheDocument();
    expect(getRequestCount).toBe(1);
    unmount();

    //! render ProductList again
    renderWithProviders(<ProductList />, queryClient);

    expect(await screen.findByText(/Mechanical Keyboard/i)).toBeInTheDocument();

    expect(getRequestCount).toBe(1);
  });
});
