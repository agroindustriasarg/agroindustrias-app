// @ts-nocheck
import { Router } from 'express';
import { getUsuarios, updateUsuario, editUsuario, deleteUsuario } from '../controllers/usuariosController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getUsuarios);
router.patch('/:id', updateUsuario);
router.put('/:id', editUsuario);
router.delete('/:id', deleteUsuario);

export default router;
