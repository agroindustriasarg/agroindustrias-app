import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma.js';

export const getUsuarios = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarios = await prisma.user.findMany({
      select: {
        id: true,
        usuario: true,
        email: true,
        nombre: true,
        apellido: true,
        rol: true,
        activo: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(usuarios);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

export const updateUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    const usuario = await prisma.user.update({
      where: { id },
      data: { activo },
      select: {
        id: true,
        usuario: true,
        email: true,
        nombre: true,
        apellido: true,
        rol: true,
        activo: true,
        createdAt: true,
      },
    });

    res.json(usuario);
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

export const editUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nombre, email, apellido, rol, password } = req.body;

    // Verificar si el email ya está en uso por otro usuario
    if (email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== id) {
        res.status(400).json({ error: 'El email ya está en uso por otro usuario' });
        return;
      }
    }

    const updateData: any = {
      nombre,
      email,
      apellido,
      rol,
    };

    // Solo actualizar password si se proporcionó uno nuevo
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const usuario = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        usuario: true,
        email: true,
        nombre: true,
        apellido: true,
        rol: true,
        activo: true,
        createdAt: true,
      },
    });

    res.json(usuario);
  } catch (error) {
    console.error('Error al editar usuario:', error);
    res.status(500).json({ error: 'Error al editar usuario' });
  }
};

export const deleteUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
};
