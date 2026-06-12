const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env'), override: true });

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const errorHandler = require('./middleware/errorHandler');
const { initSuricataRedisMonitor, syncSuricataRules } = require('./services/suricataService');
const { subscribe } = require('./sse');

const authRoutes = require('./routes/auth');
const telemetryRoutes = require('./routes/telemetry');
const boilersRoutes = require('./routes/boilers');
const suricataRoutes = require('./routes/suricata');
const profilesRoutes = require('./routes/profiles');

const app = express();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const PORT = requireEnv('PORT');
const CORS_ORIGIN = requireEnv('CORS_ORIGIN');

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/boilers', boilersRoutes);
app.use('/api/suricata', suricataRoutes);
app.use('/api/profiles', profilesRoutes);

app.get('/api/stream', subscribe);
app.use(errorHandler);

syncSuricataRules();
initSuricataRedisMonitor();

app.listen(PORT, () => {
  console.log(`Сервер слушает порт ${PORT}`);
});