// @ts-nocheck
import { Router } from 'express';
import {
  getGastos,
  createGasto,
  updateGasto,
  deleteGasto,
} from '../controllers/gastosController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getGastos);
router.post('/', createGasto);
router.put('/:id', updateGasto);
router.delete('/:id', deleteGasto);

export default router;
