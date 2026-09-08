import { GraphQLError } from 'graphql';

export function authenticationError(message = 'You must be logged in'): GraphQLError {
  return new GraphQLError(message, { extensions: { code: 'UNAUTHENTICATED' } });
}

// A valid token whose `exp` has passed. Clients should refresh (owner/vendor) or
// send the user back to login (customer/store/rider) without showing an error.
export function tokenExpiredError(message = 'Your session has expired'): GraphQLError {
  return new GraphQLError(message, { extensions: { code: 'TOKEN_EXPIRED' } });
}

// A token that can never be made valid again (bad signature, malformed, or the
// user / tokenVersion it points at is gone). Clients should clear the session.
export function invalidTokenError(message = 'Your session is no longer valid'): GraphQLError {
  return new GraphQLError(message, { extensions: { code: 'INVALID_TOKEN' } });
}

export function forbiddenError(message = 'You are not allowed to perform this action'): GraphQLError {
  return new GraphQLError(message, { extensions: { code: 'FORBIDDEN' } });
}

export function userInputError(message: string): GraphQLError {
  return new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

export function notFoundError(message: string): GraphQLError {
  return new GraphQLError(message, { extensions: { code: 'NOT_FOUND' } });
}
