import { Router } from 'express';
import Metric, { IMetric } from '../models/metric';
import User, { IUser } from '../models/user';
import { authMiddleware, roleMiddleware, AuthRequest } from '../middlewares/auth';
import { metricValidator } from '../middlewares/validations';

const router = Router();

// Función auxiliar para recalcular role y métricas de un usuario
async function recalcViewerRole(userId: string) {
  const user: IUser | null = await User.findById(userId);
  if (!user) return;

  const metrics: IMetric[] = await Metric.find({ tenantId: user.tenantId });
  user.metricsCreated = metrics.length;
  user.metricsCreatedValuable = metrics.filter(m => m.value >= 50).length;

  // Ajusta role según métricas
  if (user.metricsCreatedValuable >= 5) {
    user.role = 'analyst';
    user.canBeAnalyst = false;
  } else {
    user.role = 'viewer';
    user.canBeAnalyst = true;
  }

  await user.save();
}

// Crear métrica
router.post('/', authMiddleware, metricValidator, async (req: AuthRequest, res) => {
  try {
    const { name, value, date, userId } = req.body;

    if (!name || value === undefined) {
      return res.status(400).json({ message: 'Nombre y valor son obligatorios' });
    }

    const tenantId = req.isAdminGlobal ? (req.body.tenantId || null) : req.tenantId;
    if (!tenantId && !req.isAdminGlobal) {
      return res.status(400).json({ message: 'tenantId es obligatorio para este usuario' });
    }

    const metric = await Metric.create({ tenantId, name, value, date: date || new Date() });

    if (req.isAdminGlobal && userId) {
      await recalcViewerRole(userId);
    } else if (!req.isAdminGlobal) {
      await recalcViewerRole(req.userId!);
    }

    res.status(201).json({ message: 'Métrica creada', metric });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear métrica', error });
  }
});

// Obtener todas las métricas
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const metrics = req.isAdminGlobal
      ? await Metric.find()
      : await Metric.find({ tenantId: req.tenantId });

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar métricas', error });
  }
});

// Obtener métrica por ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const metric = req.isAdminGlobal
      ? await Metric.findById(req.params.id)
      : await Metric.findOne({ _id: req.params.id, tenantId: req.tenantId });

    if (!metric) return res.status(404).json({ message: 'Métrica no encontrada' });
    res.json(metric);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener métrica', error });
  }
});

// Actualizar métrica
router.put('/:id', authMiddleware, metricValidator, roleMiddleware(['admin', 'analyst']), async (req: AuthRequest, res) => {
  try {
    const { name, value, date } = req.body;
    const updateData: Partial<IMetric> = {};
    if (name) updateData.name = name;
    if (value !== undefined) updateData.value = value;
    if (date) updateData.date = date;

    const metric = req.isAdminGlobal
      ? await Metric.findByIdAndUpdate(req.params.id, updateData, { new: true })
      : await Metric.findOneAndUpdate(
          { _id: req.params.id, tenantId: req.tenantId },
          updateData,
          { new: true }
        );

    if (!metric) return res.status(404).json({ message: 'Métrica no encontrada o sin permisos' });

    if (metric.tenantId) {
      const viewers: IUser[] = await User.find({ tenantId: metric.tenantId });
      for (const user of viewers) {
        await recalcViewerRole(user._id.toString());
      }
    }

    res.json({ message: 'Métrica actualizada', metric });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar métrica', error });
  }
});

// Eliminar métrica
router.delete('/:id', authMiddleware, roleMiddleware(['admin', 'analyst']), async (req: AuthRequest, res) => {
  try {
    const metric = req.isAdminGlobal
      ? await Metric.findByIdAndDelete(req.params.id)
      : await Metric.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });

    if (!metric) return res.status(404).json({ message: 'Métrica no encontrada o sin permisos' });

    if (metric.tenantId) {
      const viewers: IUser[] = await User.find({ tenantId: metric.tenantId });
      for (const user of viewers) {
        await recalcViewerRole(user._id.toString());
      }
    }

    res.json({ message: 'Métrica eliminada', metric });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar métrica', error });
  }
});

export default router;