require('dotenv').config();

const express = require('express');
const pool = require('./config/db');
const locaisRoutes = require('./routes/locais.routes');
const lotesRoutes = require('./routes/lotes.routes');
const dormentesRoutes = require('./routes/dormentes.routes');
const movimentacoesRoutes = require('./routes/movimentacoes.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());

const authRoutes = require('./routes/auth.routes');
app.use('/auth', authRoutes);
app.use('/locais', locaisRoutes);
app.use('/lotes', lotesRoutes);
app.use('/dormentes', dormentesRoutes);
app.use('/movimentacoes', movimentacoesRoutes);
app.use('/dashboard', dashboardRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    application: 'MidnightTrain API'
  });
});

app.get('/health/db', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT DATABASE() AS database_name'
    );

    res.json({
      status: 'OK',
      database: rows[0].database_name
    });
  } catch (error) {
    console.error('Erro MySQL:', error.code || error.message);
    res.status(503).json({
      status: 'ERROR',
      message: 'Banco indisponível'
    });
  }
});

async function iniciarServidor() {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 64) {
  throw new Error('JWT_SECRET não configurado corretamente.');
}
  try {
    await pool.query('SELECT 1');

    app.listen(PORT, '127.0.0.1', () => {
      console.log(`API rodando em http://localhost:${PORT}`);
      console.log('MySQL conectado!');
    });
  } catch (error) {
    console.error('Falha na conexão:', error.code || error.message);
    process.exit(1);
  }
}

iniciarServidor();