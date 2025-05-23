require('dotenv').config();
const app = require('./src/app');
const config = require('./src/config');
const logger = require('./src/utils/logger');

const PORT = config.port || 3000;

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📱 Environment: ${config.nodeEnv}`);
  logger.info(`🔥 Firebase Project: ${config.firebase.projectId}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = server;