import { Router } from 'express';
import {
  getRendimientos,
  createRendimiento,
  updateRendimiento,
  deleteRendimiento,
  getRendimientosPorCampo,
  getRendimientosPorLote,
} from '../controllers/rendimientosController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getRendimientos);
router.get('/campo/:campoId', getRendimientosPorCampo);
router.get('/lote/:loteId', getRendimientosPorLote);
router.post('/', createRendimiento);
router.put('/:id', updateRendimiento);
router.delete('/:id', deleteRendimiento);

export default router;
