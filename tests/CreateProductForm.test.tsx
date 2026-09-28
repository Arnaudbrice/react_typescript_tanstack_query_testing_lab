import { screen, waitFor } from "@testing-library/react";
import userEvent, { UserEvent } from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import App from "../src/App";
import { server } from "../src/mocks/server";
import { CreateProductInput } from "../src/types/product";
import { renderWithProviders } from "./renderWithProviders";

// !Integratiionstest

type FillFormData = {
  name: string;
  price: number;
  category: string;
  nameInput: HTMLInputElement;
  priceInput: HTMLInputElement;
  categoryInput: HTMLSelectElement;
  user: UserEvent;
};

function getFormInputs() {
  const nameInput = screen.getByLabelText<HTMLInputElement>("Name");
  const priceInput = screen.getByLabelText<HTMLInputElement>("Price");
  const categoryInput = screen.getByLabelText<HTMLSelectElement>("Category");
  return { nameInput, priceInput, categoryInput };
}

async function fillForm({
  name,
  price,
  category,
  nameInput,
  priceInput,
  categoryInput,
  user,
}: FillFormData) {
  if (name) {
    await user.type(nameInput, name);
  }
  if (price) {
    await user.type(priceInput, price.toString());
  }
  if (category) {
    await user.click(categoryInput); //click on the select box
    const option = await screen.findByRole("option", { name: category });
    await user.click(option);
  }
}

describe("CreateProductForm", () => {
  const renderComponent = () => {
    // !die App-Komponent soll gerendert werden, da App sowohl CreateProductForm als auch ProductList enthält. Das wäre dann  ein Integrationstest.
    return renderWithProviders(<App />);
  };
  // TICKET 2.6
  it("submits a new product and clears the form after success", async () => {
    //!  Arrange
    const user = userEvent.setup();
    let requestBody: CreateProductInput | undefined;

    server.use(
      http.post("/api/products", async ({ request }) => {
        //! read and parse the request body
        requestBody = (await request.json()) as CreateProductInput;

        console.log("requestBody", requestBody);
        // simulate the answer from the API
        return HttpResponse.json(
          {
            id: 3,
            ...requestBody,
          },
          { status: 201 },
        );
      }),
    );

    renderComponent();

    const { nameInput, priceInput, categoryInput } = getFormInputs();
    //! act
    await fillForm({
      name: "Test Product",
      price: 12.99,
      category: "Electronics",
      nameInput,
      priceInput,
      categoryInput,
      user,
    });

    /*     await user.type(nameInput, "Test Product");
    await user.type(priceInput, "12.99");
    await user.selectOptions(categoryInput, "Electronics"); */

    await user.click(screen.getByRole("button", { name: /add product/i }));

    /*warum waitFor: Nach dem click läuft der Request asynchron bis den requestBody gesetzt ist:
    → handleSubmit
    → mutateAsync
    → fetch
    → MSW-Handler
    → requestBody wird gesetzt  */
    //! assert
    //! Wurde der richtige Request-Body gesendet?
    // request has been sent (data ) and the handler received the request
    await waitFor(() => {
      expect(requestBody).toEqual({
        name: "Test Product",
        price: 12.99,
        category: "Electronics",
      });
    });

    /*warum waitFor: nach Erfolgreicher Antwort des Requests wird der Input gelöscht und neue gerendert:
    → mutationAsync has succeeded
    → setName("")
    → setPrice("")
    → React rendert die leeren Inputs */
    // response has been sent back to the client
    //! Wurde das Formular nach Erfolg zurückgesetzt?
    await waitFor(() => {
      expect(nameInput).toHaveValue("");
      expect(priceInput).toHaveValue(null);
    });

    // categoryInput wird nicht zurückgesetzt
    expect(categoryInput).toHaveValue("Electronics");
    // !Ist der Submit-Button wieder aktiv?
    expect(screen.getByRole("button", { name: /add product/i })).toBeEnabled();
  });
  // TICKET 2.7
  it("disables the submit button while the product is being saved", async () => {
    // arrange

    let resolvePromise!: () => void;

    const pendingPromise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    const user = userEvent.setup();

    server.use(
      http.post("/api/products", async ({ request }) => {
        // read and parse the request body
        const requestBody = (await request.json()) as CreateProductInput;
        await pendingPromise; //! Request bleibt pending, bis wir ihn im Test manuell auflösen=> mutation.isPending = true → Button disabled

        return HttpResponse.json({
          id: 3,
          ...requestBody,
        });
      }),
    );

    renderComponent();

    const { nameInput, priceInput, categoryInput } = getFormInputs();
    let button = screen.getByRole("button", { name: /add product/i });

    // act

    await fillForm({
      name: "Test Product",
      price: 12.99,
      category: "Electronics",
      nameInput,
      priceInput,
      categoryInput,
      user,
    });

    await user.click(button);
    button = await screen.findByRole("button", { name: /saving/i });

    // assert
    expect(button).toBeDisabled();

    //! Serverantwort jetzt freigeben
    resolvePromise(); //(mutation.isPending = false → Button enabled)
    // after successful mutation

    //! Mutation beendet → React rendert erneut (da setName("") und setPrice("") aufgerufen wurden)
    //! Ist der Submit-Button wieder aktiv?

    button = await screen.findByRole("button", { name: /add product/i });
    await waitFor(() => {
      expect(button).toBeEnabled();
    });
  });

  // TICKET 2.8
  it("shows an error and keeps the entered values when saving fails", async () => {
    // arrange

    const user = userEvent.setup();

    // simulate an error response
    server.use(
      http.post("/api/products", () => {
        return HttpResponse.error();
      }),
    );

    renderComponent();

    const { nameInput, priceInput, categoryInput } = getFormInputs();

    const button = screen.getByRole("button", { name: /add product/i });

    //! act

    await fillForm({
      name: "Test Product",
      price: 12.99,
      category: "Electronics",
      nameInput,
      priceInput,
      categoryInput,
      user,
    });

    await user.click(button);

    //! assert

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Product could not be saved.",
    );
    expect(nameInput).toHaveValue("Test Product");
    expect(priceInput).toHaveValue(12.99);
    expect(categoryInput).toHaveValue("Electronics");
  });
});
