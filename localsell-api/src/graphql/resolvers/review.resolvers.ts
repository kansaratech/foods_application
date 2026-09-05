import { IResolvers } from '@graphql-tools/utils';
import { Order, Review } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireAuth } from '../../middleware/auth';
import { notFoundError, userInputError } from '../../utils/errors';

interface ReviewInputArgs {
  order: string;
  rating: number;
  description?: string;
  comments?: string;
}

async function computeReviewData(restaurantId: string) {
  const reviews = await prisma.review.findMany({
    where: { restaurantId },
    orderBy: { createdAt: 'desc' },
  });
  const total = reviews.length;
  const ratings = total ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
  return { total, ratings, reviews };
}

export const reviewResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    reviewsByRestaurant: async (_parent, args: { restaurant: string }) => {
      const reviews = await prisma.review.findMany({
        where: { restaurantId: args.restaurant },
        orderBy: { createdAt: 'desc' },
      });
      return { reviews };
    },
  },

  Mutation: {
    reviewOrder: async (_parent, args: { reviewInput: ReviewInputArgs }, context) => {
      const currentUser = requireAuth(context);
      const { order: orderId, rating, description, comments } = args.reviewInput;

      if (rating < 1 || rating > 5) throw userInputError('Rating must be between 1 and 5');

      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) throw notFoundError('Order not found');
      if (order.userId !== currentUser.id) throw notFoundError('Order not found');
      if (order.orderStatus !== 'DELIVERED' && order.orderStatus !== 'COMPLETED') {
        throw userInputError('You can only review an order after it has been delivered');
      }

      const existing = await prisma.review.findUnique({ where: { orderId } });
      if (existing) throw userInputError('This order has already been reviewed');

      await prisma.review.create({
        data: {
          orderId,
          restaurantId: order.restaurantId,
          userId: currentUser.id,
          rating,
          description,
          comments,
        },
      });

      return order;
    },
  },

  Order: {
    review: (parent: Order) => prisma.review.findUnique({ where: { orderId: parent.id } }),
  },

  Restaurant: {
    rating: async (parent: { id: string }) => {
      const { ratings, total } = await computeReviewData(parent.id);
      return total ? ratings : null;
    },
    reviewAverage: async (parent: { id: string }) => {
      const { ratings, total } = await computeReviewData(parent.id);
      return total ? ratings : null;
    },
    reviewData: (parent: { id: string }) => computeReviewData(parent.id),
  },

  RestaurantCarouselPreview: {
    reviewAverage: async (parent: { id: string }) => {
      const { ratings, total } = await computeReviewData(parent.id);
      return total ? ratings : null;
    },
  },

  Review: {
    _id: (parent: Review) => parent.id,
    order: async (parent: Review) => {
      const user = await prisma.user.findUnique({ where: { id: parent.userId } });
      return { user };
    },
    // No moderation/soft-delete concept for reviews yet - every persisted row is active.
    isActive: () => true,
    createdAt: (parent: Review) => parent.createdAt?.toISOString() ?? null,
  },
};
