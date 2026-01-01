import { Router } from 'express';
import { register, login } from '../controllers/authController.js';
import { prisma } from '../utils/prisma.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);

// Debug endpoint - eliminar después de diagnosticar
router.get('/debug/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        usuario: true,
        email: true,
        rol: true,
        activo: true,
      }
    });
    res.json({ users, count: users.length });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export default router;
