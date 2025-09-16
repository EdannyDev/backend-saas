import { Request, Response, NextFunction } from 'express';

// Validación de métricas
export const metricValidator = (req: Request, res: Response, next: NextFunction) => {
  const { name, value, date } = req.body;

  if (!name || typeof name !== 'string' || name.length < 3 || name.length > 50) {
    return res.status(400).json({
      message: 'El nombre es obligatorio y debe tener entre 3 y 50 caracteres',
    });
  }

  if (value === undefined || typeof value !== 'number' || value < 0) {
    return res.status(400).json({ message: 'El valor debe ser un número mayor o igual a 0' });
  }

  if (!/^\d+(\.\d{1,2})?$/.test(value.toString())) {
    return res.status(400).json({ message: 'El valor puede tener como máximo 2 decimales' });
  }

  if (date && isNaN(Date.parse(date))) {
    return res.status(400).json({ message: 'La fecha no es válida' });
  }

  next();
};

// Validación de empresas / startups (tenants)
export const tenantValidator = (req: Request, res: Response, next: NextFunction) => {
  const { name, plan } = req.body;

  if (!name || typeof name !== 'string' || name.length < 3 || name.length > 50) {
    return res.status(400).json({
      message: 'El nombre del tenant es obligatorio y debe tener entre 3 y 50 caracteres',
    });
  }

  const validPlans = ['free', 'pro'];
  if (plan && (typeof plan !== 'string' || !validPlans.includes(plan))) {
    return res.status(400).json({
      message: `El plan es inválido. Valores permitidos: ${validPlans.join(', ')}`,
    });
  }

  next();
};