// @ts-nocheck
import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export const getRendimientos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rendimientos = await prisma.rendimiento.findMany({
      include: {
        campo: true,
        lote: true,
        destino: true,
      },
      orderBy: { fecha: 'desc' },
    });
    res.json(rendimientos);
  } catch (error) {
    console.error('Error al obtener rendimientos:', error);
    res.status(500).json({ error: 'Error al obtener rendimientos' });
  }
};

export const createRendimiento = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      campana, campoId, loteId, cultivo, variedad,
      fecha, kgBrutos, descCuerposExtranos, descQuebrados, descTotalDaniados,
      descHumedad, descVolatil, descTemperatura, descGranosVerdes,
      destinoId, numeroCTG, observaciones,
    } = req.body;

    const kgNetos =
      parseFloat(kgBrutos) -
      (parseFloat(descCuerposExtranos) || 0) -
      (parseFloat(descQuebrados) || 0) -
      (parseFloat(descTotalDaniados) || 0) -
      (parseFloat(descHumedad) || 0) -
      (parseFloat(descVolatil) || 0) -
      (parseFloat(descTemperatura) || 0) -
      (parseFloat(descGranosVerdes) || 0);

    const rendimiento = await prisma.rendimiento.create({
      data: {
        campana,
        campoId,
        loteId,
        cultivo,
        variedad: variedad || null,
        fecha: new Date(fecha),
        kgBrutos: parseFloat(kgBrutos),
        descCuerposExtranos: parseFloat(descCuerposExtranos) || 0,
        descQuebrados: parseFloat(descQuebrados) || 0,
        descTotalDaniados: parseFloat(descTotalDaniados) || 0,
        descHumedad: parseFloat(descHumedad) || 0,
        descVolatil: parseFloat(descVolatil) || 0,
        descTemperatura: parseFloat(descTemperatura) || 0,
        descGranosVerdes: parseFloat(descGranosVerdes) || 0,
        kgNetos,
        destinoId: destinoId || null,
        numeroCTG: numeroCTG || null,
        observaciones: observaciones || null,
      },
      include: { campo: true, lote: true, destino: true },
    });

    res.status(201).json(rendimiento);
  } catch (error) {
    console.error('Error al crear rendimiento:', error);
    res.status(500).json({ error: 'Error al crear rendimiento' });
  }
};

export const updateRendimiento = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      campana, campoId, loteId, cultivo, variedad,
      fecha, kgBrutos, descCuerposExtranos, descQuebrados, descTotalDaniados,
      descHumedad, descVolatil, descTemperatura, descGranosVerdes,
      destinoId, numeroCTG, observaciones,
    } = req.body;

    const kgNetos =
      parseFloat(kgBrutos) -
      (parseFloat(descCuerposExtranos) || 0) -
      (parseFloat(descQuebrados) || 0) -
      (parseFloat(descTotalDaniados) || 0) -
      (parseFloat(descHumedad) || 0) -
      (parseFloat(descVolatil) || 0) -
      (parseFloat(descTemperatura) || 0) -
      (parseFloat(descGranosVerdes) || 0);

    const rendimiento = await prisma.rendimiento.update({
      where: { id },
      data: {
        campana,
        campoId,
        loteId,
        cultivo,
        variedad: variedad || null,
        fecha: new Date(fecha),
        kgBrutos: parseFloat(kgBrutos),
        descCuerposExtranos: parseFloat(descCuerposExtranos) || 0,
        descQuebrados: parseFloat(descQuebrados) || 0,
        descTotalDaniados: parseFloat(descTotalDaniados) || 0,
        descHumedad: parseFloat(descHumedad) || 0,
        descVolatil: parseFloat(descVolatil) || 0,
        descTemperatura: parseFloat(descTemperatura) || 0,
        descGranosVerdes: parseFloat(descGranosVerdes) || 0,
        kgNetos,
        destinoId: destinoId || null,
        numeroCTG: numeroCTG || null,
        observaciones: observaciones || null,
      },
      include: { campo: true, lote: true, destino: true },
    });

    res.json(rendimiento);
  } catch (error) {
    console.error('Error al actualizar rendimiento:', error);
    res.status(500).json({ error: 'Error al actualizar rendimiento' });
  }
};

export const deleteRendimiento = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.rendimiento.delete({ where: { id } });
    res.json({ message: 'Rendimiento eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar rendimiento:', error);
    res.status(500).json({ error: 'Error al eliminar rendimiento' });
  }
};
