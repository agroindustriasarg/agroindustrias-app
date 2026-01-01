import { Router } from 'express';
import {
  getContratistas,
  getContratista,
  createContratista,
  updateContratista,
  deleteContratista,
} from '../controllers/contratistasController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getContratistas);
router.get('/:id', getContratista);
router.post('/', createContratista);
router.put('/:id', updateContratista);
router.delete('/:id', deleteContratista);

export default router;
