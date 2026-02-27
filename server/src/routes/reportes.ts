// @ts-nocheck
import { Router } from 'express';
import {
  getResumenGeneral,
  getGastosPorCategoria,
  getGastosPorCuenta,
  getGastosPorCampo,
  getServiciosRealizados,
  getConsumoStock,
  getRendimientos,
} from '../controllers/reportesController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/resumen-general', getResumenGeneral);
router.get('/gastos-por-categoria', getGastosPorCategoria);
router.get('/gastos-por-cuenta', getGastosPorCuenta);
router.get('/gastos-por-campo', getGastosPorCampo);
router.get('/servicios-realizados', getServiciosRealizados);
router.get('/consumo-stock', getConsumoStock);
router.get('/rendimientos', getRendimientos);

export default router;
