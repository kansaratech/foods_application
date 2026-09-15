
import { ApolloError } from '@apollo/client';
export const onErrorMessageMatcher = <T extends string>(
  type: T | undefined,
  message: string | undefined | string[],
  errorMessages: Record<T, string[]>
): boolean => {
  if (!type) return true;
  return errorMessages[type]?.some((emessage) => emessage === message) ?? false;
};




// Update input type to allow 'Error'
export const getGraphQLErrorMessage = (
  error: ApolloError | Error | undefined | null
): string | null => {
  if (!error) return null;

  const isApolloError = (err: unknown): err is ApolloError => {
    if (typeof err !== 'object' || err === null) {
      return false;
    }

    return 'graphQLErrors' in err || 'networkError' in err;
  };

  if (isApolloError(error)) {
    if (error.networkError) {
      const netErr = error.networkError as Error & {
        statusCode?: number;
        bodyText?: string;
        result?: { errors?: Array<{ message?: string }> };
      };
      // Apollo Server returns a non-2xx HTTP status for a GraphQL response
      // that contains `errors` (e.g. a plain userInputError like "GSTIN is
      // required"), but Apollo Client's HttpLink buckets ANY non-2xx status
      // as a networkError instead of graphQLErrors — even though the body it
      // already parsed (`result`) still carries the real GraphQL error
      // message. Surface that instead of a generic "Request failed (400)".
      const gqlMessage = netErr.result?.errors?.map((e) => e.message).filter(Boolean).join(', ');
      if (gqlMessage) return gqlMessage;
      if (netErr.statusCode === 413) {
        return 'That file is too large for the server to accept. Please upload a smaller file.';
      }
      if (typeof netErr.statusCode === 'number' && netErr.statusCode >= 500) {
        return `Server error (${netErr.statusCode}). Please try again in a moment.`;
      }
      if (typeof netErr.statusCode === 'number') {
        return `Request failed (${netErr.statusCode}). Please try again.`;
      }
      // No status code at all means the request never got a response to parse
      // (offline, DNS/CORS failure, or the connection was dropped mid-upload).
      return netErr.message
        ? `Connection failed: ${netErr.message}`
        : 'Connection failed. Please check your internet connection.';
    }

    if (error.graphQLErrors?.length) {
      return error.graphQLErrors.map((e) => e.message).join(', ');
    }

    return (
      error.message?.replace(/^GraphQL error: /, '') ||
      'An unexpected error occurred.'
    );
  }

  return error.message || 'An unexpected error occurred.';
};