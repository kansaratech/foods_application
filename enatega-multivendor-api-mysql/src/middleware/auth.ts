import { User, UserType } from '@prisma/client';
import { GraphQLContext } from '../context';
import { authenticationError, forbiddenError } from '../utils/errors';

export function requireAuth(context: GraphQLContext): User {
  if (!context.user) {
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
