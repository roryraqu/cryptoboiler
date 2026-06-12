const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const swaggerAutogen = require('swagger-autogen')({ openapi: '3.0.0' });

const doc = {
  info: {
    title: 'CryptoBoiler API',
    description: 'API Documentation',
    version: '1.0.0'
  },
  servers: [
    {
      url: 'https://cryptoboiler.duckdns.org:7443',
      description: 'Production'
    }
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: process.env.COOKIE_NAME || 'access_token'
      }
    },
    responses: {
      SuccessOK: { description: 'Успешное выполнение (Код 200)' },
      SuccessCreated: { description: 'Успешно создано (Код 201)' },
      BadRequest: {
        description: 'Неверный синтаксис или ошибка валидации (Код 400)',
        content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string', example: 'Сервер не понял запрос' } } } } }
      },
      Unauthorized: {
        description: 'Необходима аутентификация (Код 401)',
        content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string', example: 'Необходима аутентификация' } } } } }
      },
      Forbidden: {
        description: 'Доступ запрещен (Код 403)',
        content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string', example: 'Доступ запрещен' } } } } }
      },
      NotFound: {
        description: 'Запрашиваемый ресурс не найден (Код 404)',
        content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string', example: 'Ресурс не найден' } } } } }
      },
      BadGateway: {
        description: 'Шлюз получил некорректный ответ от устройства (Код 502)',
        content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string', example: 'Котел недоступен' } } } } }
      },
      InternalServerError: {
        description: 'Внутренняя ошибка сервера (Код 500)',
        content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string', example: 'Внутренняя ошибка сервера' } } } } }
      }
    }
  },
  security: [{ cookieAuth: [] }]
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./server.js'];

swaggerAutogen(outputFile, endpointsFiles, doc);