// @ts-nocheck
import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const cuentaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  tipo: z.enum(['EMPRESA', 'PERSONAL', 'TERCEROS'], {
    errorMap: () => ({ message: 'El tipo debe ser EMPRESA, PERSONAL o TERCEROS' })
  }),
  titular: z.string().optional(),
  descripcion: z.string().optional(),
});

const pagoSchema = z.object({
  fecha: z.string().datetime(),
  monto: z.number().positive(),
  formaPago: z.string().min(1),
  observaciones: z.string().optional(),
});

export const getCuentas = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cuentas = await prisma.cuenta.findMany({
      where: { activo: true },
      include: {
        _count: {
          select: {
            gastos: true,
          },
        },
      },
      orderBy: [
        { tipo: 'asc' },
        { nombre: 'asc' },
      ],
    });

    res.json(cuentas);
  } catch (error) {
    console.error('Error al obtener cuentas:', error);
    res.status(500).json({ error: 'Error al obtener cuentas' });
  }
};

export const getCuenta = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const cuenta = await prisma.cuenta.findUnique({
      where: { id },
      include: {
        gastos: {
          include: {
            campo: true,
            maquinaria: true,
          },
          orderBy: { fecha: 'desc' },
        },
      },
    });

    if (!cuenta) {
      res.status(404).json({ error: 'Cuenta no encontrada' });
      return;
    }

    res.json(cuenta);
  } catch (error) {
    console.error('Error al obtener cuenta:', error);
    res.status(500).json({ error: 'Error al obtener cuenta' });
  }
};

export const createCuenta = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validatedData = cuentaSchema.parse(req.body);

    // Verificar que no exista una cuenta con el mismo nombre
    const existente = await prisma.cuenta.findUnique({
      where: { nombre: validatedData.nombre },
    });

    if (existente) {
      res.status(400).json({ error: 'Ya existe una cuenta con ese nombre' });
      return;
    }

    const cuenta = await prisma.cuenta.create({
      data: validatedData,
    });

    res.status(201).json(cuenta);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Error al crear cuenta:', error);
    res.status(500).json({ error: 'Error al crear cuenta' });
  }
};

export const updateCuenta = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const validatedData = cuentaSchema.partial().parse(req.body);

    // Si se está cambiando el nombre, verificar que no exista
    if (validatedData.nombre) {
      const existente = await prisma.cuenta.findFirst({
        where: {
          nombre: validatedData.nombre,
          id: { not: id },
        },
      });

      if (existente) {
        res.status(400).json({ error: 'Ya existe una cuenta con ese nombre' });
        return;
      }
    }

    const cuenta = await prisma.cuenta.update({
      where: { id },
      data: validatedData,
    });

    res.json(cuenta);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Error al actualizar cuenta:', error);
    res.status(500).json({ error: 'Error al actualizar cuenta' });
  }
};

export const deleteCuenta = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Verificar si la cuenta tiene gastos asociados
    const cuenta = await prisma.cuenta.findUnique({
      where: { id },
      include: {
        _count: {
          select: { gastos: true },
        },
      },
    });

    if (!cuenta) {
      res.status(404).json({ error: 'Cuenta no encontrada' });
      return;
    }

    if (cuenta._count.gastos > 0) {
      // Solo desactivar si tiene gastos
      await prisma.cuenta.update({
        where: { id },
        data: { activo: false },
      });
      res.json({ message: 'Cuenta desactivada correctamente (tiene gastos asociados)' });
    } else {
      // Eliminar si no tiene gastos
      await prisma.cuenta.delete({
        where: { id },
      });
      res.json({ message: 'Cuenta eliminada correctamente' });
    }
  } catch (error) {
    console.error('Error al eliminar cuenta:', error);
    res.status(500).json({ error: 'Error al eliminar cuenta' });
  }
};

// Obtener gastos de una cuenta
export const getGastosCuenta = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const gastos = await prisma.gasto.findMany({
      where: { cuentaId: id },
      orderBy: { fecha: 'desc' },
    });

    res.json(gastos);
  } catch (error) {
    console.error('Error al obtener gastos de cuenta:', error);
    res.status(500).json({ error: 'Error al obtener gastos' });
  }
};

// Obtener estadísticas por cuenta
export const getEstadisticasCuenta = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const estadisticas = await prisma.gasto.aggregate({
      where: { cuentaId: id },
      _sum: {
        monto: true,
      },
      _count: {
        id: true,
      },
    });

    res.json({
      totalGastos: estadisticas._sum.monto || 0,
      cantidadGastos: estadisticas._count.id,
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de cuenta:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

// Registrar pago a una cuenta
export const createPago = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const validatedData = pagoSchema.parse(req.body);

    // Verificar que la cuenta existe
    const cuenta = await prisma.cuenta.findUnique({
      where: { id },
    });

    if (!cuenta) {
      res.status(404).json({ error: 'Cuenta no encontrada' });
      return;
    }

    // Crear el pago como un gasto negativo
    const pago = await prisma.gasto.create({
      data: {
        concepto: `Pago de cuenta - ${validatedData.formaPago}`,
        categoria: 'Pago',
        monto: -Math.abs(validatedData.monto), // Asegurar que sea negativo
        fecha: new Date(validatedData.fecha),
        descripcion: validatedData.observaciones || `Pago realizado mediante ${validatedData.formaPago}`,
        cuentaId: id,
        usuarioId: req.user?.id,
      },
    });

    res.status(201).json(pago);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Error al registrar pago:', error);
    res.status(500).json({ error: 'Error al registrar pago' });
  }
};
