import { IResolvers } from '@graphql-tools/utils';
import { GraphQLContext } from '../../context';
import { commonResolvers } from './common.resolvers';
import { userResolvers } from './user.resolvers';
import { restaurantResolvers } from './restaurant.resolvers';
import { foodResolvers } from './food.resolvers';
import { orderResolvers } from './order.resolvers';
import { adminResolvers } from './admin.resolvers';
import { subscriptionResolvers } from './subscriptions.resolvers';
import { zoneResolvers } from './zone.resolvers';
import { riderResolvers } from './rider.resolvers';
import { staffResolvers } from './staff.resolvers';
import { couponResolvers } from './coupon.resolvers';
import { bannerResolvers } from './banner.resolvers';

type ResolverMap = Record<string, Record<string, unknown>>;

function mergeResolvers(maps: IResolvers<unknown, GraphQLContext>[]): IResolvers<unknown, GraphQLContext> {
  const merged: ResolverMap = {};
  for (const map of maps as ResolverMap[]) {
    for (const [typeName, fields] of Object.entries(map)) {
      merged[typeName] = { ...(merged[typeName] ?? {}), ...fields };
    }
  }
  return merged as IResolvers<unknown, GraphQLContext>;
}

export const resolvers = mergeResolvers([
  commonResolvers,
  userResolvers,
  restaurantResolvers,
  foodResolvers,
  orderResolvers,
  adminResolvers,
  subscriptionResolvers,
  zoneResolvers,
  riderResolvers,
  staffResolvers,
  couponResolvers,
  bannerResolvers,
]);
