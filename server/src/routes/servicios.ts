// @ts-nocheck
import { Router } from 'express';
import {
  getServicios,
  createServicio,
  updateServicio,
  deleteServicio,
} from '../controllers/serviciosController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getServicios);
router.post('/', createServicio);
router.put('/:id', updateServicio);
router.patch('/:id', updateServicio);
router.delete('/:id', deleteServicio);

export default router;
