import http from 'http';
import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';

import { env } from './config/env';
import { typeDefs } from './graphql/typeDefs';
import { resolvers } from './graphql/resolvers';
import { buildHttpContext, buildWsContext, GraphQLContext } from './context';
import { idAwareDefaultFieldResolver } from './utils/defaultFieldResolver';

async function main() {
  const app = express();
  const httpServer = http.createServer(app);

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
    defaultFieldResolver: idAwareDefaultFieldResolver,
  });

  const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });
  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx) => buildWsContext(ctx.connectionParams as Record<string, unknown> | undefined),
    },
    wsServer,
  );

  const apolloServer = new ApolloServer<GraphQLContext>({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });
  await apolloServer.start();

  app.use(
    '/uploads',
    express.static(env.uploadDir),
  );

  app.use(
    '/graphql',
    cors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',') }),
    express.json({ limit: '10mb' }),
    expressMiddleware(apolloServer, { context: buildHttpContext }),
  );

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  await new Promise<void>((resolve) => httpServer.listen({ port: env.port }, resolve));
  console.log(`GraphQL server ready at http://localhost:${env.port}/graphql`);
  console.log(`GraphQL subscriptions ready at ws://localhost:${env.port}/graphql`);
}

main().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
