import { unwrapResolverError } from '@apollo/server/errors';
import { Prisma } from '@prisma/client';
import { GraphQLFormattedError } from 'graphql';

// Map the Prisma field a unique constraint fired on to a human sentence.
const UNIQUE_FIELD_MESSAGES: Record<string, string> = {
  phone: 'This phone number is already registered to another account.',
  email: 'This email address is already registered to another account.',
  username: 'That login email is already in use by another store.',
  slug: 'A store with a very similar name already exists — try a more distinct name.',
};

function friendlyUniqueMessage(target: unknown): string {
  const fields = Array.isArray(target)
    ? target.map(String)
    : String(target ?? '').split(/[_,\s]+/);
  for (const field of fields) {
    const key = Object.keys(UNIQUE_FIELD_MESSAGES).find((k) =>
      field.toLowerCase().includes(k),
    );
    if (key) return UNIQUE_FIELD_MESSAGES[key];
  }
  return 'That value is already in use. Please use a different one.';
}

/**
 * Never let a raw Prisma error (e.g. `Unique constraint failed on the fields:
 * (`phone`)`) reach a client. Translate the common ones into plain sentences and
 * keep an opaque message for everything unexpected.
 */
export function formatError(
  formatted: GraphQLFormattedError,
  error: unknown,
): GraphQLFormattedError {
  const original = unwrapResolverError(error);

  if (original instanceof Prisma.PrismaClientKnownRequestError) {
    if (original.code === 'P2002') {
      return {
        ...formatted,
        message: friendlyUniqueMessage(original.meta?.target),
        extensions: { ...formatted.extensions, code: 'BAD_USER_INPUT' },
      };
    }
    if (original.code === 'P2025') {
      return {
        ...formatted,
        message: 'That record no longer exists.',
        extensions: { ...formatted.extensions, code: 'NOT_FOUND' },
      };
    }
    // Any other DB-level failure: don't expose internals.
    return {
      ...formatted,
      message: 'Something went wrong while saving. Please try again.',
      extensions: { ...formatted.extensions, code: 'INTERNAL_SERVER_ERROR' },
    };
  }

  return formatted;
}
