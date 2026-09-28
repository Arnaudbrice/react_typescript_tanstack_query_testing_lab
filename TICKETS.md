# Northstar Inventory — Testing Tickets

## Rules

- Do not mock TanStack Query itself.
- Prefer MSW for API behavior.
- Use a fresh QueryClient per test through `renderWithProviders`.
- Test what the user can see/do, not library internals.
- Use `userEvent.setup()` for user interaction.
- You may add small test helpers if they reduce repetition.

## TICKET 2.1 — Loading state

Write a test for `ProductList` that proves the loading message is visible while the GET `/api/products` request is pending.

Acceptance criteria:
- Override the MSW handler with a deliberate delay.
- Assert `Loading products...` appears.
- Do not test TanStack Query internals.

## TICKET 2.2 — Successful product rendering

Write a test that verifies products returned by the API are rendered.

Acceptance criteria:
- Override GET `/api/products` with at least two products of your own.
- Assert both product names appear.
- Assert at least one price is displayed correctly.

## TICKET 2.3 — Empty state

Write a test for an empty API response.

Acceptance criteria:
- GET `/api/products` returns `[]`.
- `No products found.` is visible.
- Loading state is gone.

## TICKET 2.4 — GET error state

Write a test for a server failure.

Acceptance criteria:
- GET `/api/products` returns HTTP 500.
- `Could not load products.` is displayed as an alert.
- The products heading/list is not rendered.

## TICKET 2.5 — Parameterized GET failures

Convert the error test into a parameterized test using `it.each()`.

Cases:
- 400
- 404
- 500
- 503

Acceptance criteria:
- Every status produces the same user-facing error state.
- The status code is part of the test name or test data.

## TICKET 2.6 — Successful mutation

Test `CreateProductForm`.

Acceptance criteria:
- Enter name `Monitor`.
- Enter price `299.99`.
- Select category `Electronics`.
- Submit the form.
- Verify the POST request receives the expected JSON body (capture it in the MSW handler).
- Verify the form fields are cleared after success.

## TICKET 2.7 — Pending mutation state

Test the UI while POST `/api/products` is deliberately pending.

Acceptance criteria:
- Use an MSW delay.
- After clicking submit, the button becomes disabled.
- Button text changes to `Saving...`.
- When the request finishes, button becomes enabled again and text returns to `Add product`.

## TICKET 2.8 — Mutation error

Test a failed POST.

Acceptance criteria:
- POST `/api/products` returns HTTP 500.
- `Product could not be saved.` is visible with role `alert`.
- Submit button becomes enabled again.
- User-entered values remain in the form after failure.

## TICKET 2.9 — Cache invalidation in practice

Write an integration-style test that renders both `CreateProductForm` and `ProductList` under the same QueryClient.

Acceptance criteria:
- Initial products load.
- User creates `Monitor`.
- POST succeeds.
- Because the mutation invalidates `["products"]`, ProductList refetches.
- `Monitor` eventually appears in the product list.
- Do not call `refetch()` manually in the test.

## TICKET 2.10 — Query cache isolation

Prove tests do not share cached query data.

Acceptance criteria:
- Write two tests with different GET responses.
- Each test must see only its own products.
- Do not manually clear the QueryClient cache.
- Rely on `renderWithProviders` creating a new QueryClient.

## BONUS 2.11 — Prefetching

Create a small test component or helper that calls `queryClient.prefetchQuery` for `["products"]` before `ProductList` mounts.

Acceptance criteria:
- Prefetch resolves first.
- ProductList can immediately read cached data.
- Explain in a comment why `prefetchQuery` performs the request while `setQueryData` would not.

## BONUS 2.12 — `setQueryData`

After a successful POST, create an alternative custom mutation hook for the exercise that inserts the returned product directly into `["products"]` using `setQueryData` instead of invalidating.

Acceptance criteria:
- There is no second GET request after POST.
- The newly returned product still appears in ProductList.
- Keep this exercise separate from the production hook so you can compare both approaches.
