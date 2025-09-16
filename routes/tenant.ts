import { Router } from 'express';
import Tenant from '../models/tenant';
import User from '../models/user';
import Metric from '../models/metric';
import { authMiddleware, roleMiddleware, AuthRequest } from '../middlewares/auth';
import { tenantValidator } from '../middlewares/validations';

const router = Router();

// Crear tenant (solo admin)
router.post('/', authMiddleware, tenantValidator, roleMiddleware(['admin']), async (req: AuthRequest, res) => {
  try {
    const { name, plan } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'El nombre del tenant es obligatorio' });
    }

    const existingTenant = await Tenant.findOne({ name });
    if (existingTenant) {
      return res.status(400).json({ message: 'El tenant ya existe' });
    }

    const tenant = await Tenant.create({ name, plan });
    res.status(201).json({ message: 'Tenant creado', tenant });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear tenant', error });
  }
});

// Listar tenants
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const tenants = req.isAdminGlobal
      ? await Tenant.find()
      : await Tenant.find({ _id: req.tenantId });

    res.json(tenants);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar tenants', error });
  }
});

// Obtener tenant por ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    let tenant;

    if (req.isAdminGlobal) {
      tenant = await Tenant.findById(req.params.id);
    } else {
      if (req.tenantId?.toString() !== req.params.id) {
        return res.status(403).json({ message: 'No tienes permisos para ver este tenant' });
      }
      tenant = await Tenant.findById(req.tenantId);
    }

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant no encontrado' });
    }

    res.json(tenant);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener tenant', error });
  }
});

// Actualizar tenant (solo admin)
router.put('/:id', authMiddleware, tenantValidator, roleMiddleware(['admin']), async (req: AuthRequest, res) => {
  try {
    const { name, plan } = req.body;
    const updateData: any = { name, plan };

    const updatedTenant = await Tenant.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedTenant) {
      return res.status(404).json({ message: 'Tenant no encontrado' });
    }

    res.json({ message: 'Tenant actualizado', updatedTenant });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar tenant', error });
  }
});

// Eliminar tenant (solo admin)
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const deletedTenant = await Tenant.findByIdAndDelete(req.params.id);
    if (!deletedTenant) return res.status(404).json({ message: 'Tenant no encontrado' });

    await User.deleteMany({ tenantId: req.params.id });
    await Metric.deleteMany({ tenantId: req.params.id });

    res.json({ message: 'Tenant eliminado con sus usuarios y métricas' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar tenant', error });
  }
});

export default router;