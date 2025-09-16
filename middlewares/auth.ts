import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  tenantId?: string | null;
  role?: string;
  isAdminGlobal?: boolean;
}

// Middleware de autenticación
export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ message: 'No autorizado: falta token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    req.userId = decoded.userId;
    req.tenantId = decoded.tenantId || null;
    req.role = decoded.role;
    req.isAdminGlobal = decoded.email?.endsWith('@saas.io') || false;

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido o expirado', error: err });
  }
};

// Middleware de roles
export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.isAdminGlobal) return next();
    if (!req.role || !allowedRoles.includes(req.role)) {
      return res.status(403).json({ message: 'No tienes permisos para esta acción' });
    }
    next();
  };
};

// Validador de contraseña
export const passwordValidator = (req: Request, res: Response, next: NextFunction) => {
  const { password } = req.body;
  if (!password) return next();

  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  if (!regex.test(password)) {
    return res.status(400).json({
      message: 'Contraseña insegura: Mayúscula, minúscula, número, símbolo y 8 caracteres mínimo.',
    });
  }
  next();
};