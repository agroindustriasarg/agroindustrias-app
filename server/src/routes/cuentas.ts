// @ts-nocheck
import { Router } from 'express';
import {
  getCuentas,
  getCuenta,
  createCuenta,
  updateCuenta,
  deleteCuenta,
  getGastosCuenta,
  getEstadisticasCuenta,
  createPago,
} from '../controllers/cuentasController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getCuentas);
router.get('/:id', getCuenta);
router.get('/:id/gastos', getGastosCuenta);
router.get('/:id/estadisticas', getEstadisticasCuenta);
router.post('/', createCuenta);
router.post('/:id/pagos', createPago);
router.put('/:id', updateCuenta);
router.delete('/:id', deleteCuenta);

export default router;
