require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
  🚌  BusLink API Server
  ─────────────────────────────
  ✅  Running on port ${PORT}
  📡  http://localhost:${PORT}
  🔑  Environment: ${process.env.NODE_ENV || 'development'}
  ─────────────────────────────
  `);
});
