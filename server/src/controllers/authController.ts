// @ts-nocheck
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma.js';
import { generateToken } from '../utils/jwt.js';
import { z } from 'zod';

const registerSchema = z.object({
  usuario: z.string().min(3, 'El usuario debe tener al menos 3 caracteres'),
  email: z.string().min(1, 'La empresa es requerida'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  apellido: z.string().min(1, 'El apellido es requerido'),
  rol: z.enum(['ADMIN', 'GERENTE', 'OPERARIO', 'VISOR']).optional(),
});

const loginSchema = z.object({
  usuario: z.string().min(1, 'El usuario es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { usuario: validatedData.usuario },
          { email: validatedData.email },
        ],
      },
    });

    if (existingUser) {
      res.status(400).json({ error: 'El usuario o email ya existe' });
      return;
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    const user = await prisma.user.create({
      data: {
        usuario: validatedData.usuario,
        email: validatedData.email,
        password: hashedPassword,
        nombre: validatedData.nombre,
        apellido: validatedData.apellido,
        rol: validatedData.rol || 'OPERARIO',
      },
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

    const token = generateToken({
      userId: user.id,
      usuario: user.usuario,
      rol: user.rol,
    });

    res.status(201).json({ user, token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { usuario: validatedData.usuario },
    });

    if (!user || !user.activo) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(
      validatedData.password,
      user.password
    );

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const token = generateToken({
      userId: user.id,
      usuario: user.usuario,
      rol: user.rol,
    });

    res.json({
      user: {
        id: user.id,
        usuario: user.usuario,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        rol: user.rol,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};
