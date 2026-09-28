import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProduct } from "../api/products";
import { productKeys } from "./useProducts";
import { Product } from "../types/product";

export default function useCreateProduct() {
  const queryClient = useQueryClient();

  // wenn mutation.mutate({...product}) aufgerufen wird, wird createProduct({...product})aufgerufen
  return useMutation({
    mutationFn: createProduct,
    /*  onSuccess: () => {
      void queryClient.invalidateQueries({
        //markiere alle query mit dem key productKeys.all als stale
        queryKey: productKeys.all,
      });

    }, */

    //! Läuft vor mutationFn.
    // onMutate: async (newProduct, context) => {
    // Zugriff auf query Client mit context.client
    // await context.client.cancelQueries({ queryKey: productKeys.all });
    onMutate: async (newProduct, _context) => {
      //! verhindern, dass eine laufende passende Query später mit ihrer Response unser optimistisches Update überschreibt.(queryClient.cancelQueries)
      await queryClient.cancelQueries({ queryKey: productKeys.all });

      const previousState = queryClient.getQueryData<Product[]>(
        productKeys.all,
      );

      const optimisticId = -Date.now();
      const optimisticProduct: Product = {
        ...newProduct,
        id: optimisticId,
      };

      // setze die optimistischen Daten in den cache
      queryClient.setQueryData<Product[]>(
        productKeys.all,
        (oldProducts = []) => [...oldProducts, optimisticProduct],
      );
      //! return onMutateResult
      return {
        previousState,
        optimisticId,
      };
    },
    //! Läuft bei Erfolg.
    onSuccess: (data, _variables, onMutateResult, _context) => {
      //!onSuccess wird aufgerufen, wenn die Mutation erfolgreich ist mit dem neu erstellten product(von der mutationFn)
      // query cache sofort mit neuen Daten aktualisieren
      queryClient.setQueryData<Product[]>(
        productKeys.all,
        (oldProducts = []) => {
          const newProducts = oldProducts.map((product) => {
            if (product.id !== onMutateResult?.optimisticId) {
              return product;
            }
            return data; //ersetze das optimistische product mit dem neu erstellten product (von der mutationFn=data)
          });
          return newProducts;
        },
      );
    },
    //! Läuft bei einem Fehler.
    onError: (_error, _variables, onMutateResult, _context) => {
      // cache Daten mit den vorherigen Daten zurücksetzen
      queryClient.setQueryData(productKeys.all, onMutateResult?.previousState);
    },
    onSettled: () => {
      return queryClient.invalidateQueries({
        queryKey: productKeys.all,
      });
    },
  });
}

/* Mit invalidateQueries():

POST
→ Server antwortet
→ invalidateQueries()
→ Query wird stale
→active observer werden benachtigt (isFetching=true)+ re-render und Refetch(Serverdatenabfrage + cache update)
→nach refetch ,active observer werden benachtigt (data und isFetching=false) +re-render(hole neue Daten aus dem cache)
→ UI aktualisiert

Mit setQueryData():

POST
→ Server antwortet mit createdProduct
→ Cache direkt aktualisieren
→ active observer werden benachrichtigt (data hat sich im cache geändert) und re-rendert(hole neue Daten aus dem cache)
→ UI aktualisiert


Aber invalidateQueries() ist oft sicherer/einfacher, weil du den aktuellen Serverstand neu holst. Das ist wichtig, wenn der Server beim Speichern noch zusätzliche Dinge verändert, zum Beispiel Felder ergänzt, sortiert, Beziehungen lädt oder andere Daten beeinflusst.*/
