import { Router } from 'express';
import authRoutes from './auth.js';
import camposRoutes from './campos.js';
import maquinariasRoutes from './maquinarias.js';
import stockRoutes from './stock.js';
import gastosRoutes from './gastos.js';
import serviciosRoutes from './servicios.js';
import contratistasRoutes from './contratistas.js';
import cuentasRoutes from './cuentas.js';
import reportesRoutes from './reportes.js';
import rendimientosRoutes from './rendimientos.js';
import usuariosRoutes from './usuarios.js';
import facturasRoutes from './facturas.js';
import pagosRoutes from './pagos.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/campos', camposRoutes);
router.use('/maquinarias', maquinariasRoutes);
router.use('/stock', stockRoutes);
router.use('/gastos', gastosRoutes);
router.use('/servicios', serviciosRoutes);
router.use('/contratistas', contratistasRoutes);
router.use('/cuentas', cuentasRoutes);
router.use('/reportes', reportesRoutes);
router.use('/rendimientos', rendimientosRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/facturas', facturasRoutes);
router.use('/pagos', pagosRoutes);

export default router;
