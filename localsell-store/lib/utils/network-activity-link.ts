import { ApolloLink, Observable } from "@apollo/client";
import { getMainDefinition } from "@apollo/client/utilities";
import { networkActivity } from "./network-activity";

/** Finish on success, failure or cancellation; subscriptions never hold a loader open. */
export const networkActivityLink = new ApolloLink((operation, forward) => {
  const definition = getMainDefinition(operation.query);
  if (
    (definition.kind === "OperationDefinition" &&
      definition.operation === "subscription") ||
    operation.getContext().silentLoading
  )
    return forward(operation);
  return new Observable((observer) => {
    const finish = networkActivity.begin();
    try {
      const subscription = forward(operation).subscribe({
        next: (value) => observer.next(value),
        error: (error) => {
          finish();
          observer.error(error);
        },
        complete: () => {
          finish();
          observer.complete();
        },
      });
      return () => {
        subscription.unsubscribe();
        finish();
      };
    } catch (error) {
      finish();
      observer.error(error);
    }
  });
});
