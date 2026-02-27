// @ts-nocheck
import { Router } from 'express';
import {
  getMaquinarias,
  getMaquinaria,
  createMaquinaria,
  updateMaquinaria,
  deleteMaquinaria,
} from '../controllers/maquinariasController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getMaquinarias);
router.get('/:id', getMaquinaria);
router.post('/', createMaquinaria);
router.put('/:id', updateMaquinaria);
router.delete('/:id', deleteMaquinaria);

export default router;
