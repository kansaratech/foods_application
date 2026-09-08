import { User, UserType } from '@prisma/client';
import { GraphQLContext } from '../context';
import {
  authenticationError,
  forbiddenError,
  invalidTokenError,
  tokenExpiredError,
} from '../utils/errors';

export function requireAuth(context: GraphQLContext): User {
  if (!context.user) {
    if (context.authError === 'expired') throw tokenExpiredError();
    if (context.authError === 'invalid') throw invalidTokenError();
    throw authenticationError();
  }
  return context.user;
}

export function requireRole(context: GraphQLContext, roles: UserType[]): User {
  const user = requireAuth(context);
  if (!roles.includes(user.userType)) {
    throw forbiddenError();
  }
  return user;
}
