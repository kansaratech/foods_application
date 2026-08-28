import http from 'http';
import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { execute, subscribe } from 'graphql';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { SubscriptionServer } from 'subscriptions-transport-ws';

import { env } from './config/env';
import { typeDefs } from './graphql/typeDefs';
import { resolvers } from './graphql/resolvers';
import { buildHttpContext, buildWsContext, GraphQLContext } from './context';
import { idAwareDefaultFieldResolver } from './utils/defaultFieldResolver';

// WebSocket sub-protocols. The frontends in this repo are split across both:
//   * "graphql-transport-ws" -> modern graphql-ws client
//   * "graphql-ws"           -> legacy subscriptions-transport-ws client
//     (admin, web, customer app and rider use @apollo/client/link/ws)
const MODERN_WS_PROTOCOL = 'graphql-transport-ws';
const LEGACY_WS_PROTOCOL = 'graphql-ws';

async function main() {
  const app = express();
  const httpServer = http.createServer(app);

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
    defaultFieldResolver: idAwareDefaultFieldResolver,
  });

  // Both subscription servers run in `noServer` mode; a single `upgrade`
  // handler below routes each connection to the right one by sub-protocol so
  // every frontend gets working subscriptions without a client-side change.
  const modernWsServer = new WebSocketServer({ noServer: true });
  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx) => buildWsContext(ctx.connectionParams as Record<string, unknown> | undefined),
    },
    modernWsServer,
  );

  const legacyWsServer = new WebSocketServer({ noServer: true });
  const legacySubscriptionServer = SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,
      onConnect: (connectionParams: Record<string, unknown>) => buildWsContext(connectionParams),
    },
    legacyWsServer,
  );

  httpServer.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    if (pathname !== '/graphql') return;

    const requested = (req.headers['sec-websocket-protocol'] ?? '')
      .toString()
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    const useLegacy =
      requested.includes(LEGACY_WS_PROTOCOL) && !requested.includes(MODERN_WS_PROTOCOL);
    const target = useLegacy ? legacyWsServer : modernWsServer;

    target.handleUpgrade(req, socket, head, (ws) => {
      target.emit('connection', ws, req);
    });
  });

  const apolloServer = new ApolloServer<GraphQLContext>({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
              legacySubscriptionServer.close();
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
  console.log(`GraphQL subscriptions ready at ws://localhost:${env.port}/graphql (graphql-transport-ws + legacy graphql-ws)`);
}

main().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
