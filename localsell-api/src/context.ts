import { User } from '@prisma/client';
import { prisma } from './prisma/client';
import { verifyAccessToken } from './services/auth.service';

export interface GraphQLContext {
  user: User | null;
}

async function loadUserFromAuthHeader(authHeader: string | undefined): Promise<User | null> {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const payload = verifyAccessToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || user.tokenVersion !== payload.tokenVersion) return null;
  return user;
}

export async function buildHttpContext({ req }: { req: { headers: Record<string, unknown> } }): Promise<GraphQLContext> {
  const authHeader = req.headers.authorization as string | undefined;
  const user = await loadUserFromAuthHeader(authHeader);
  return { user };
}

export async function buildWsContext(connectionParams: Record<string, unknown> | undefined): Promise<GraphQLContext> {
  const authHeader =
    (connectionParams?.authorization as string | undefined) ??
    (connectionParams?.Authorization as string | undefined);
  const user = await loadUserFromAuthHeader(authHeader);
  return { user };
}
