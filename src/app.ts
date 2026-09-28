import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import pinoHttp from 'pino-http';
import { apiRouter, healthRoutes } from './routes';
import { notFoundHandler, errorHandler } from './middleware/error.middleware';
import { requestIdMiddleware } from './middleware/requestId.middleware';
import { logger } from './config/logger';
import { swaggerSpec } from './docs/swagger';


export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));
  app.use(requestIdMiddleware);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as { requestId?: string }).requestId ?? 'unknown',
      redact: ['req.headers.authorization', 'req.headers["x-webhook-secret"]'],
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    }),
  );

  // Health
  app.use('/health', healthRoutes);

  // API v1
  app.use('/api/v1', apiRouter);

  // Docs
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
