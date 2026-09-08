import { User } from '@prisma/client';
import { GraphQLError } from 'graphql';
import { prisma } from './prisma/client';
import { verifyAccessToken } from './services/auth.service';

export type AuthError = 'expired' | 'invalid';

export interface GraphQLContext {
  user: User | null;
  // Set only when an Authorization header was present but could not be honoured.
  // `requireAuth` turns this into a TOKEN_EXPIRED / INVALID_TOKEN GraphQL error
  // so every frontend can tell "log back in" from "refresh" from "never authed".
  authError?: AuthError;
}

interface LoadResult {
  user: User | null;
  authError?: AuthError;
}

async function loadUserFromAuthHeader(authHeader: string | undefined): Promise<LoadResult> {
  if (!authHeader) return { user: null };
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { user: null };

  const result = verifyAccessToken(token);
  if (!result.ok) {
    return { user: null, authError: result.reason };
  }

  let user: User | null;
  try {
    user = await prisma.user.findUnique({ where: { id: result.payload.userId } });
  } catch (error) {
    // A transient DB failure must not masquerade as an auth failure (that would
    // log everyone out on a blip). Surface it as a real, retryable error.
    console.error('[context] failed to load user for auth token', error);
    throw new GraphQLError('Service temporarily unavailable', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }

  // User row gone (e.g. a reseed) or credentials rotated elsewhere (password
  // change bumps tokenVersion): the token can never be valid again.
  if (!user || user.tokenVersion !== result.payload.tokenVersion) {
    return { user: null, authError: 'invalid' };
  }
  return { user };
}

export async function buildHttpContext({ req }: { req: { headers: Record<string, unknown> } }): Promise<GraphQLContext> {
  const authHeader = req.headers.authorization as string | undefined;
  return loadUserFromAuthHeader(authHeader);
}

export async function buildWsContext(connectionParams: Record<string, unknown> | undefined): Promise<GraphQLContext> {
  const authHeader =
    (connectionParams?.authorization as string | undefined) ??
    (connectionParams?.Authorization as string | undefined);
  return loadUserFromAuthHeader(authHeader);
}
