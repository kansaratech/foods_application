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
import { reviewResolvers } from './review.resolvers';
import { dashboardResolvers } from './dashboard.resolvers';
import { paymentResolvers } from './payment.resolvers';
import { notificationResolvers } from './notification.resolvers';
import { supportResolvers } from './support.resolvers';
import { chatResolvers } from './chat.resolvers';
import { compatResolvers } from './compat.resolvers';
import { serviceabilityResolvers } from './serviceability.resolvers';
import { commissionResolvers } from './commission.resolvers';
import { financeOpsResolvers } from './finance-ops.resolvers';
import { storeDocsResolvers } from './store-docs.resolvers';
import { vendorDocsResolvers } from './vendor-docs.resolvers';
import { riderDocsResolvers } from './rider-docs.resolvers';
import { auditResolvers } from './audit.resolvers';

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
  reviewResolvers,
  dashboardResolvers,
  paymentResolvers,
  notificationResolvers,
  supportResolvers,
  chatResolvers,
  compatResolvers,
  serviceabilityResolvers,
  commissionResolvers,
  financeOpsResolvers,
  storeDocsResolvers,
  vendorDocsResolvers,
  riderDocsResolvers,
  auditResolvers,
]);
