import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getProveedores, createProveedor } from '../controllers/proveedoresController.js';

const router = Router();

router.get('/', authMiddleware, getProveedores);
router.post('/', authMiddleware, createProveedor);

export default router;
