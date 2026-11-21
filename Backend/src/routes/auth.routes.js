
const { Router } = require('express');
const { rateLimit } = require('express-rate-limit');

const { login } = require('../controllers/auth.controller');
const {
  autenticarToken,
  autorizarRoles
} = require('../middlewares/auth.middleware');

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    mensagem: 'Muitas tentativas de login. Tente novamente mais tarde.'
  }
});

router.post('/login', loginLimiter, login);

router.get('/me', autenticarToken, (req, res) => {
  res.json({
    usuario: req.usuario
  });
});

router.get(
  '/manager-check',
  autenticarToken,
  autorizarRoles('MANAGER'),
  (req, res) => {
    res.json({
      mensagem: 'Acesso autorizado para gerente.',
      usuario: req.usuario.nome
    });
  }
);

module.exports = router;
