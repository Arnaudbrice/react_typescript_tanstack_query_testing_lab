import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { resetProducts } from "./mocks/handlers";
import { server } from "./mocks/server";

// Establish API mocking before all tests.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  cleanup();
  // entfernt die Handler, die während eines Tests mit server.use() hinzugefügt wurden. Danach gelten wieder die ursprünglichen Handler aus handlers.ts, die beim Serverstart übergeben wurden ( const server = setupServer(...handlers))
  server.resetHandlers();
  resetProducts();
});

// close the server when the test suite ends
afterAll(() => server.close());
