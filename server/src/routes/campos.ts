import { Router } from 'express';
import {
  getCampos,
  getCampo,
  createCampo,
  updateCampo,
  deleteCampo,
  createLote,
  updateLote,
  deleteLote,
} from '../controllers/camposController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getCampos);
router.get('/:id', getCampo);
router.post('/', createCampo);
router.put('/:id', updateCampo);
router.delete('/:id', deleteCampo);

router.post('/:campoId/lotes', createLote);
router.put('/lotes/:id', updateLote);
router.delete('/lotes/:id', deleteLote);

export default router;
