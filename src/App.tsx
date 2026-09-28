import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import CreateProductForm from "./components/CreateProductForm";
import ProductList from "./components/ProductList";
import "./styles.css";

export default function App() {
  return (
    <>
      <main className="app-shell">
        <header>
          <p className="eyebrow">Professional Testing Lab</p>
          <h1>Northstar Inventory</h1>
          <p>
            Practice React, TypeScript, TanStack Query, MSW and Vitest on a
            realistic feature.
          </p>
        </header>
        <div className="grid">
          <CreateProductForm />
          <ProductList />
        </div>
      </main>

      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}
