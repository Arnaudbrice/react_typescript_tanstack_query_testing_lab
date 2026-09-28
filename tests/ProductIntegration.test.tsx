import { screen } from "@testing-library/react";
import userEvent, { UserEvent } from "@testing-library/user-event";
import { describe, it } from "vitest";
import App from "../src/App";
import { renderWithProviders } from "./renderWithProviders";

type FillFormData = {
  name: string;
  price: number;
  category: string;
  nameInput: HTMLInputElement;
  priceInput: HTMLInputElement;
  categoryInput: HTMLSelectElement;
  user: UserEvent;
};

export function getFormInputs() {
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

describe("product query and mutation integration", () => {
  const renderComponent = () => {
    renderWithProviders(<App />);
  };
  // TICKET 2.9
  it("refetches the product list after a successful product creation", async () => {
    /* GET #1 is called before the form is submitted
        ↓
display old product list
        ↓
POST successfully
        ↓
invalidateQueries
        ↓
GET #2 is called again after successful mutation
        ↓
new product is displayed */
    const user = userEvent.setup();

    //!if we don't redefine the msw handlers, their will be called before the renderWithProviders function is called per default

    renderComponent();

    //! list of products is displayed before the form is submitted

    expect(await screen.findByText("Mechanical Keyboard")).toBeInTheDocument();
    expect(await screen.findByText("TypeScript Handbook")).toBeInTheDocument();

    const { nameInput, priceInput, categoryInput } = getFormInputs();
    const button = screen.getByRole("button", { name: /add product/i });
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

    // ! after successful mutation, the product list is refetched and the ui is updated with the new product

    expect(await screen.findByText("Test Product")).toBeInTheDocument();
  });
});
