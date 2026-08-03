import { defaultFieldResolver, GraphQLFieldResolver } from 'graphql';

/**
 * Every GraphQL type in this schema exposes `_id`, but Prisma models use `id`.
 * Types with a dedicated resolver map (`Restaurant`, `User`, ...) alias it
 * explicitly, but "lite" projection types (`RestaurantLite`, `OrderUserLite`, ...)
 * that just pass a raw Prisma row through would otherwise hit GraphQL's default
 * resolver, which looks for a literal `_id` property, finds none, and returns
 * null for a non-nullable field. This fallback makes `_id` resolve from `id`
 * everywhere unless a type already resolves it explicitly.
 */
export const idAwareDefaultFieldResolver: GraphQLFieldResolver<unknown, unknown> = (
  source,
  args,
  context,
  info,
) => {
  if (
    info.fieldName === '_id' &&
    source &&
    typeof source === 'object' &&
    !('_id' in source) &&
    'id' in source
  ) {
    return (source as { id: unknown }).id;
  }
  return defaultFieldResolver(source, args, context, info);
};
