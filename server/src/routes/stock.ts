// @ts-nocheck
import { Router } from 'express';
import {
  getStock,
  getStockById,
  getMovimientos,
  getMovimientosAgroquimicos,
  createStock,
  updateStock,
  deleteStock,
  createMovimiento,
  deleteMovimiento,
  recalcularStock,
} from '../controllers/stockController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getStock);
router.get('/movimientos/agroquimicos', getMovimientosAgroquimicos);
router.get('/:id', getStockById);
router.get('/:id/movimientos', getMovimientos);
router.post('/', createStock);
router.put('/:id', updateStock);
router.delete('/:id', deleteStock);
router.post('/:stockId/movimientos', createMovimiento);
router.delete('/:stockId/movimientos/:movimientoId', deleteMovimiento);
router.post('/:id/recalcular', recalcularStock);

export default router;
