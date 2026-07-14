require('dotenv').config();
const mongoose = require('mongoose');
const { getConfig, validateRuntimeConfig } = require('./config/env');

let server;
let shuttingDown = false;

const start = async () => {
  const config = getConfig();
  validateRuntimeConfig(config);
  await mongoose.connect(config.mongodbUri, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10
  });
  const app = require('./app');
  server = app.listen(config.port, () => {
    console.info(JSON.stringify({
      nivel: 'info',
      evento: 'server_started',
      porta: config.port,
      ambiente: config.nodeEnv
    }));
  });
  return server;
};

const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(JSON.stringify({ nivel: 'info', evento: 'shutdown_started', sinal: signal }));
  const forceExit = setTimeout(() => process.exit(1), 10000);
  forceExit.unref();
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await mongoose.disconnect();
  clearTimeout(forceExit);
  console.info(JSON.stringify({ nivel: 'info', evento: 'shutdown_completed' }));
};

if (require.main === module) {
  start().catch((error) => {
    console.error(JSON.stringify({ nivel: 'error', evento: 'startup_failed', mensagem: error.message }));
    process.exitCode = 1;
  });
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = { start, shutdown };
