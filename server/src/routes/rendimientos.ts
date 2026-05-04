// @ts-nocheck
import { Router } from 'express';
import {
  getRendimientos,
  createRendimiento,
  updateRendimiento,
  deleteRendimiento,
} from '../controllers/rendimientosController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getRendimientos);
router.post('/', createRendimiento);
router.put('/:id', updateRendimiento);
router.delete('/:id', deleteRendimiento);

export default router;
