import { useState, type SubmitEvent } from "react";
import useCreateProduct from "../hooks/useCreateProduct";

export default function CreateProductForm() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Electronics");
  const mutation = useCreateProduct();

  console.log("mutation", mutation);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      // call createProduct({name, price, category}) to create a product and update the cache(on sucess invalidating the cache)
      await mutation.mutateAsync({
        name,
        price: Number(price),
        category,
      });

      // clear input fields
      setName("");
      setPrice("");
    } catch {
      // The mutation exposes the error through mutation.isError.
      // Keeping the catch here prevents an unhandled rejected Promise
      // from the form submit event.
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="create product">
      <h2>Add product</h2>

      <label>
        Name
        <input
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </label>

      <label>
        Price
        <input
          name="price"
          type="number"
          min="0.01"
          step="0.01"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          required
        />
      </label>

      <label>
        Category
        <select
          name="category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}>
          <option>Electronics</option>
          <option>Books</option>
          <option>Home</option>
        </select>
      </label>

      <button disabled={mutation.isPending}>
        {mutation.isPending ? "Saving..." : "Add product"}
      </button>

      {/* mutation (post request) error handling */}
      {mutation.isError && <p role="alert">Product could not be saved.</p>}
    </form>
  );
}
