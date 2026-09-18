import { useMutation } from "@apollo/client";
import { MARK_PICKUP_COLLECTED } from "../apollo/mutations/order.mutation";

export default function useMarkPickupCollected() {
  const [mutateCollected, { loading, error }] = useMutation(
    MARK_PICKUP_COLLECTED,
  );
  const markCollected = (id: string) => {
    mutateCollected({ variables: { id } });
  };

  return { loading, error, markCollected };
}
