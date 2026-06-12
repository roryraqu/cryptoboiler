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
    }
  },
  security: [{ cookieAuth: [] }]
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./server.js'];

swaggerAutogen(outputFile, endpointsFiles, doc);