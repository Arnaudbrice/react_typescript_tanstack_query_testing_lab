import useProducts from "../hooks/useProducts";

export default function ProductList() {
  const { data: products, isLoading, isError } = useProducts();

  if (isLoading) {
    return <p role="status">Loading products...</p>;
  }

  if (isError) {
    return <p role="alert">Could not load products.</p>;
  }

  if (!products?.length) {
    return <p>No products found.</p>;
  }

  return (
    <section aria-labelledby="products-heading">
      <h1 id="products-heading">Products</h1>
      <ul>
        {products.map((product) => (
          <li key={product.id}>
            <strong>{product.name}</strong>
            <span> — €{product.price.toFixed(2)}</span>
            <span> ({product.category})</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
