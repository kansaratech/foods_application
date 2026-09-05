import { IResolvers } from '@graphql-tools/utils';
import { Cuisine, Prisma, ShopType } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { saveBase64Image } from '../../services/upload.service';
import { requireRole } from '../../middleware/auth';
import { GraphQLContext } from '../../context';
import { notFoundError } from '../../utils/errors';
import { recordAudit } from '../../utils/audit';

// All 17 "save X configuration" mutations write into this one singleton row.
// `data` should only contain the keys that mutation actually owns - callers
// pass `undefined` for anything the form didn't submit, which is dropped
// here so it never overwrites an existing value with null.
async function saveConfiguration(context: GraphQLContext, data: Prisma.ConfigurationUpdateInput) {
  requireRole(context, ['ADMIN']);
  const clean = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
  const existing = await prisma.configuration.findFirst();
  const result = existing
    ? await prisma.configuration.update({ where: { id: existing.id }, data: clean })
    : await prisma.configuration.create({ data: clean });
  // Never log secret values.
  const fields = Object.keys(clean).filter((k) => !/key|secret|token|password|sid/i.test(k));
  await recordAudit(context, {
    action: 'config.update',
    targetType: 'Configuration',
    summary: `Configuration updated: ${Object.keys(clean).join(', ') || '—'}`,
    changes: Object.fromEntries(fields.map((k) => [k, (clean as Record<string, unknown>)[k]])),
  });
  return result;
}

function slugify(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}`;
}

interface CreateShopTypeInputArgs {
  name: string;
  image?: string;
}

interface UpdateShopTypeInputArgs {
  _id: string;
  name?: string;
  image?: string;
  isActive?: boolean;
}

interface CuisineInputArgs {
  _id?: string;
  name: string;
  description?: string;
  image?: string;
  shopType?: string;
}

async function resolveShopTypeId(shopType?: string | null): Promise<string | undefined> {
  if (!shopType) return undefined;
  const byId = await prisma.shopType.findUnique({ where: { id: shopType } });
  if (byId) return byId.id;
  const bySlug = await prisma.shopType.findUnique({ where: { slug: shopType } });
  return bySlug?.id;
}

export const commonResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    configuration: async () => {
      const config = await prisma.configuration.findFirst();
      return config;
    },
    fetchAllShopTypes: async () => {
      const data = await prisma.shopType.findMany();
      return { data };
    },
    fetchShopTypes: async (_parent, args: { filter?: { search?: string; isActive?: boolean }; pagination?: { page?: number; limit?: number } }) => {
      const limit = args.pagination?.limit ?? 20;
      const page = args.pagination?.page ?? 1;
      const where = {
        ...(args.filter?.search ? { name: { contains: args.filter.search } } : {}),
        ...(args.filter?.isActive != null ? { isActive: args.filter.isActive } : {}),
      };
      const [data, total] = await Promise.all([
        prisma.shopType.findMany({ where, skip: (page - 1) * limit, take: limit }),
        prisma.shopType.count({ where }),
      ]);
      const totalPages = Math.max(1, Math.ceil(total / limit));
      return { data, total, page, pageSize: limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 };
    },
    cuisines: async () => prisma.cuisine.findMany(),
    cuisinesPaginated: async (
      _parent,
      args: { page?: number; limit?: number; search?: string; shopType?: string },
    ) => {
      const limit = args.limit ?? 10;
      const page = args.page ?? 1;
      const where = {
        ...(args.search ? { name: { contains: args.search } } : {}),
        ...(args.shopType ? { shopTypeId: await resolveShopTypeId(args.shopType) } : {}),
      };
      const [data, totalCount] = await Promise.all([
        prisma.cuisine.findMany({ where, skip: (page - 1) * limit, take: limit }),
        prisma.cuisine.count({ where }),
      ]);
      return { data, totalCount, currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / limit)) };
    },
  },
  Mutation: {
    uploadImageToS3: (_parent, args: { image: string }, context) => {
      requireRole(context, ['ADMIN', 'VENDOR']);
      const imageUrl = saveBase64Image(args.image);
      return { imageUrl };
    },

    createShopType: (_parent, args: { dto: CreateShopTypeInputArgs }, context) => {
      requireRole(context, ['ADMIN']);
      return prisma.shopType.create({ data: { name: args.dto.name, image: args.dto.image, slug: slugify(args.dto.name) } });
    },
    updateShopType: (_parent, args: { dto: UpdateShopTypeInputArgs }, context) => {
      requireRole(context, ['ADMIN']);
      return prisma.shopType.update({
        where: { id: args.dto._id },
        data: { name: args.dto.name, image: args.dto.image, isActive: args.dto.isActive },
      });
    },
    deleteShopType: (_parent, args: { id: string }, context) => {
      requireRole(context, ['ADMIN']);
      return prisma.shopType.delete({ where: { id: args.id } });
    },

    createCuisine: async (_parent, args: { cuisineInput: CuisineInputArgs }, context) => {
      // Additive-only and low-risk (shared taxonomy, no ownership), and the
      // vendor's own "Add Store" wizard has a built-in "Add Cuisine" button
      // that relies on this - see restaurant-details.tsx (vendor flow).
      requireRole(context, ['ADMIN', 'VENDOR']);
      return prisma.cuisine.create({
        data: {
          name: args.cuisineInput.name,
          description: args.cuisineInput.description,
          image: args.cuisineInput.image,
          shopTypeId: await resolveShopTypeId(args.cuisineInput.shopType),
        },
      });
    },
    editCuisine: async (_parent, args: { cuisineInput: CuisineInputArgs }, context) => {
      requireRole(context, ['ADMIN']);
      if (!args.cuisineInput._id) throw notFoundError('Cuisine _id is required to edit');
      return prisma.cuisine.update({
        where: { id: args.cuisineInput._id },
        data: {
          name: args.cuisineInput.name,
          description: args.cuisineInput.description,
          image: args.cuisineInput.image,
          shopTypeId: args.cuisineInput.shopType ? await resolveShopTypeId(args.cuisineInput.shopType) : undefined,
        },
      });
    },
    deleteCuisine: async (_parent, args: { id: string }, context) => {
      requireRole(context, ['ADMIN']);
      await prisma.cuisine.delete({ where: { id: args.id } });
      return true;
    },

    saveEmailConfiguration: (
      _parent,
      args: {
        configurationInput: {
          email?: string;
          emailName?: string;
          enableEmail?: boolean;
          password?: string;
          smtpHost?: string;
          smtpPort?: number;
          smtpSecure?: boolean;
          smtpUser?: string;
        };
      },
      context,
    ) =>
      saveConfiguration(context, {
        email: args.configurationInput.email,
        emailName: args.configurationInput.emailName,
        enableEmail: args.configurationInput.enableEmail,
        smtpHost: args.configurationInput.smtpHost,
        smtpPort: args.configurationInput.smtpPort,
        smtpSecure: args.configurationInput.smtpSecure,
        smtpUser: args.configurationInput.smtpUser,
        ...(args.configurationInput.password ? { emailPassword: args.configurationInput.password } : {}),
      }),

    saveFormEmailConfiguration: (_parent, args: { configurationInput: { formEmail?: string } }, context) =>
      saveConfiguration(context, { formEmail: args.configurationInput.formEmail }),

    saveSendGridConfiguration: (
      _parent,
      args: { configurationInput: { sendGridEnabled?: boolean; sendGridEmail?: string; sendGridEmailName?: string; apiKey?: string } },
      context,
    ) =>
      saveConfiguration(context, {
        sendGridEnabled: args.configurationInput.sendGridEnabled,
        sendGridEmail: args.configurationInput.sendGridEmail,
        sendGridEmailName: args.configurationInput.sendGridEmailName,
        ...(args.configurationInput.apiKey ? { sendGridApiKey: args.configurationInput.apiKey } : {}),
      }),

    saveFirebaseConfiguration: (
      _parent,
      args: {
        configurationInput: {
          firebaseKey?: string;
          authDomain?: string;
          projectId?: string;
          storageBucket?: string;
          msgSenderId?: string;
          appId?: string;
          measurementId?: string;
          vapidKey?: string;
        };
      },
      context,
    ) => saveConfiguration(context, args.configurationInput),

    saveSentryConfiguration: (
      _parent,
      args: {
        configurationInput: {
          dashboardSentryUrl?: string;
          webSentryUrl?: string;
          apiSentryUrl?: string;
          customerAppSentryUrl?: string;
          restaurantAppSentryUrl?: string;
          riderAppSentryUrl?: string;
        };
      },
      context,
    ) => saveConfiguration(context, args.configurationInput),

    saveGoogleApiKeyConfiguration: (_parent, args: { configurationInput: { googleApiKey?: string } }, context) =>
      saveConfiguration(context, { googleMapsApiKey: args.configurationInput.googleApiKey }),

    saveCloudinaryConfiguration: (_parent, args: { configurationInput: { cloudinaryUploadUrl?: string; cloudinaryApiKey?: string } }, context) =>
      saveConfiguration(context, args.configurationInput),

    saveAmplitudeApiKeyConfiguration: (_parent, args: { configurationInput: { webAmplitudeApiKey?: string; appAmplitudeApiKey?: string } }, context) =>
      saveConfiguration(context, args.configurationInput),

    saveGoogleClientIDConfiguration: (
      _parent,
      args: { configurationInput: { webClientID?: string; androidClientID?: string; iOSClientID?: string; expoClientID?: string } },
      context,
    ) => saveConfiguration(context, args.configurationInput),

    saveWebConfiguration: (_parent, args: { configurationInput: { googleMapLibraries?: string; googleColor?: string } }, context) =>
      saveConfiguration(context, args.configurationInput),

    saveAppConfigurations: (
      _parent,
      args: {
        configurationInput: {
          termsAndConditions?: string;
          privacyPolicy?: string;
          testOtp?: string;
          enableCustomerDemoMode?: boolean;
          customerDemoZoneId?: string;
        };
      },
      context,
    ) => saveConfiguration(context, args.configurationInput),

    saveDeliveryRateConfiguration: (_parent, args: { configurationInput: { deliveryRate?: number; costType?: string } }, context) =>
      saveConfiguration(context, args.configurationInput),

    savePaypalConfiguration: (
      _parent,
      args: { configurationInput: { clientId?: string; sandbox?: boolean; clientSecret?: string } },
      context,
    ) =>
      saveConfiguration(context, {
        paypalClientId: args.configurationInput.clientId,
        paypalSandbox: args.configurationInput.sandbox,
        ...(args.configurationInput.clientSecret ? { paypalClientSecret: args.configurationInput.clientSecret } : {}),
      }),

    saveStripeConfiguration: (_parent, args: { configurationInput: { publishableKey?: string; secretKey?: string } }, context) =>
      saveConfiguration(context, {
        stripePublishableKey: args.configurationInput.publishableKey,
        ...(args.configurationInput.secretKey ? { stripeSecretKey: args.configurationInput.secretKey } : {}),
      }),

    saveTwilioConfiguration: (
      _parent,
      args: {
        configurationInput: {
          twilioAccountSid?: string;
          twilioPhoneNumber?: string;
          twilioEnabled?: boolean;
          twilioWhatsAppNumber?: string;
          twilioAuthToken?: string;
        };
      },
      context,
    ) =>
      saveConfiguration(context, {
        twilioAccountSid: args.configurationInput.twilioAccountSid,
        twilioPhoneNumber: args.configurationInput.twilioPhoneNumber,
        twilioEnabled: args.configurationInput.twilioEnabled,
        twilioWhatsAppNumber: args.configurationInput.twilioWhatsAppNumber,
        ...(args.configurationInput.twilioAuthToken ? { twilioAuthToken: args.configurationInput.twilioAuthToken } : {}),
      }),

    saveVerificationsToggle: (
      _parent,
      args: { configurationInput: { skipEmailVerification?: boolean; skipMobileVerification?: boolean; skipWhatsAppOTP?: boolean } },
      context,
    ) => saveConfiguration(context, args.configurationInput),

    saveCurrencyConfiguration: (_parent, args: { configurationInput: { currency?: string; currencySymbol?: string } }, context) =>
      saveConfiguration(context, args.configurationInput),

    saveCommissionConfiguration: (
      _parent,
      args: {
        configurationInput: {
          defaultCommissionRate?: number;
          commissionBillingCycle?: string;
          riderCashLimit?: number;
          platformLegalName?: string;
          platformAddress?: string;
          platformGstin?: string;
          defaultLatitude?: number;
          defaultLongitude?: number;
        };
      },
      context,
    ) => saveConfiguration(context, args.configurationInput),
  },
  Configuration: {
    _id: (parent: { id: string }) => parent.id,
    clientId: (parent: { paypalClientId?: string | null }) => parent.paypalClientId ?? null,
    sandbox: (parent: { paypalSandbox?: boolean }) => parent.paypalSandbox ?? null,
    publishableKey: (parent: { stripePublishableKey?: string | null }) => parent.stripePublishableKey ?? null,
  },
  ShopType: {
    _id: (parent: ShopType) => parent.id,
  },
  Cuisine: {
    _id: (parent: Cuisine) => parent.id,
    shopType: async (parent: Cuisine) => {
      if (!parent.shopTypeId) return null;
      const shopType = await prisma.shopType.findUnique({ where: { id: parent.shopTypeId } });
      return shopType?.slug ?? null;
    },
  },
};
