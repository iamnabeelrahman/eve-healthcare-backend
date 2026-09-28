import swaggerJsdoc from 'swagger-jsdoc';
import { env } from '../config/env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'EVE Healthcare Diagnostic Booking API',
      version: '1.0.0',
      description:
        'Backend for diagnostic centre management, bookings, simulated payments, and idempotent payment webhooks.',
    },
    servers: [{ url: `http://localhost:${env.PORT}/api/v1` }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        webhookSecret: {
          type: 'apiKey',
          in: 'header',
          name: 'x-webhook-secret',
        },
      },
      schemas: {
        Success: {
          type: 'object',
          properties: { success: { type: 'boolean', example: true }, data: { type: 'object' } },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Invalid request' },
              },
            },
          },
        },
      },
    },
    paths: {
      '/auth/signup': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email', 'password'],
                  properties: {
                    name: { type: 'string', example: 'John Doe' },
                    email: { type: 'string', example: 'john@example.com' },
                    password: { type: 'string', example: 'SecurePassword123' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Created' },
            409: {
              description: 'Email in use',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
            },
            400: { description: 'Validation error' },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'OK' }, 401: { description: 'Invalid credentials' } },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'OK' }, 401: { description: 'Unauthorized' } },
        },
      },
      '/centres': {
        get: {
          tags: ['Centres'],
          summary: 'List centres (paginated)',
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
          ],
          responses: { 200: { description: 'OK' } },
        },
        post: {
          tags: ['Centres'],
          summary: 'Create a centre (ADMIN)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'location'],
                  properties: {
                    name: { type: 'string', example: 'Downtown Diagnostics' },
                    location: { type: 'string', example: 'Mumbai' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Created' }, 403: { description: 'Forbidden' } },
        },
      },
      '/centres/{id}': {
        get: {
          tags: ['Centres'],
          summary: 'Get centre by id',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'OK' }, 404: { description: 'Not found' } },
        },
        patch: {
          tags: ['Centres'],
          summary: 'Update centre (ADMIN)',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'OK' } },
        },
        delete: {
          tags: ['Centres'],
          summary: 'Delete centre (ADMIN)',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 204: { description: 'Deleted' } },
        },
      },
      '/centres/{centreId}/tests': {
        get: {
          tags: ['Centres'],
          summary: 'List tests offered by a centre',
          parameters: [
            { in: 'path', name: 'centreId', required: true, schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'OK' } },
        },
        post: {
          tags: ['Centres'],
          summary: 'Associate test with centre (ADMIN)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'centreId', required: true, schema: { type: 'string' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['testId', 'price'],
                  properties: {
                    testId: { type: 'string' },
                    price: { type: 'number', example: 1500 },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Created' }, 409: { description: 'Duplicate' } },
        },
      },
      '/tests': {
        get: {
          tags: ['Tests'],
          summary: 'List tests (paginated)',
          responses: { 200: { description: 'OK' } },
        },
        post: {
          tags: ['Tests'],
          summary: 'Create test (ADMIN)',
          security: [{ bearerAuth: [] }],
          responses: { 201: { description: 'Created' } },
        },
      },
      '/tests/{id}': {
        get: {
          tags: ['Tests'],
          summary: 'Get test',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'OK' } },
        },
        patch: {
          tags: ['Tests'],
          summary: 'Update test (ADMIN)',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'OK' } },
        },
        delete: {
          tags: ['Tests'],
          summary: 'Delete test (ADMIN)',
          security: [{ bearerAuth: [] }],
          responses: { 204: { description: 'Deleted' } },
        },
      },
      '/bookings': {
        post: {
          tags: ['Bookings'],
          summary: 'Create booking',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['centreTestId', 'appointmentDateTime'],
                  properties: {
                    centreTestId: { type: 'string' },
                    appointmentDateTime: { type: 'string', example: '2030-01-01T10:00:00.000Z' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Created' },
            404: { description: 'Centre/test not found' },
          },
        },
        get: {
          tags: ['Bookings'],
          summary: 'List current user bookings',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'OK' } },
        },
      },
      '/bookings/{id}': {
        get: {
          tags: ['Bookings'],
          summary: 'Get booking',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'OK' },
            403: { description: 'Forbidden' },
            404: { description: 'Not found' },
          },
        },
      },
      '/bookings/{id}/cancel': {
        patch: {
          tags: ['Bookings'],
          summary: 'Cancel booking',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'OK' } },
        },
      },
      '/payments': {
        post: {
          tags: ['Payments'],
          summary: 'Simulate payment for a booking',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['bookingId'],
                  properties: { bookingId: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            201: { description: 'Payment attempt created' },
            409: { description: 'Conflict' },
          },
        },
      },
      '/payments/webhook': {
        post: {
          tags: ['Payments'],
          summary: 'Simulated provider webhook (idempotent)',
          security: [{ webhookSecret: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['eventId', 'eventType', 'paymentId', 'bookingId', 'status'],
                  properties: {
                    eventId: { type: 'string', example: 'evt_123' },
                    eventType: { type: 'string', example: 'payment.status_updated' },
                    paymentId: { type: 'string', example: 'pay_123' },
                    bookingId: { type: 'string' },
                    status: { type: 'string', enum: ['SUCCESS', 'FAILED'] },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Processed or already seen' },
            401: { description: 'Invalid webhook secret' },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
