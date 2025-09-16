import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Types } from 'mongoose';
import User from '../models/user';
import Tenant from '../models/tenant';
import Metric from '../models/metric';
import { sendResetEmail } from '../utils/mailer';
import { authMiddleware, roleMiddleware, AuthRequest, passwordValidator } from '../middlewares/auth';

const router = Router();

// Registro
router.post('/register', passwordValidator, async (req, res) => {
  try {
    const { tenantName, name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nombre, email y contraseña son obligatorios' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'El email ya está registrado' });

    const role: 'admin' | 'viewer' = email.toLowerCase().endsWith('@saas.io') ? 'admin' : 'viewer';

    let tenantId: Types.ObjectId | null = null;
    if (role === 'viewer') {
      if (!tenantName) return res.status(400).json({ message: 'El tenantName es obligatorio para usuarios no admin' });
      const tenant = await Tenant.create({ name: tenantName });
      tenantId = tenant._id as Types.ObjectId;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = {
      tenantId,
      name,
      email,
      password: hashedPassword,
      role,
      ...(role === 'viewer' && { metricsCreated: 0, metricsCreatedValuable: 0, canBeAnalyst: false }),
    };

    const user = await User.create(userData);

    res.status(201).json({
      message: 'Usuario registrado correctamente',
      userId: user._id,
      role,
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ message: 'Error en registro', error });
  }
});

// Inicio de sesión
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email y contraseña son obligatorios' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Usuario no encontrado' });

    let isMatch = await bcrypt.compare(password, user.password);
    let usingTemp = false;

    if (!isMatch && user.tempPassword) {
      if (user.tempPasswordExpires && user.tempPasswordExpires < new Date()) {
        user.tempPassword = undefined;
        user.tempPasswordExpires = undefined;
        await user.save();
        return res.status(400).json({ message: 'La contraseña temporal ha expirado. Solicita otra.' });
      }

      isMatch = await bcrypt.compare(password, user.tempPassword);
      if (isMatch) usingTemp = true;
    }

    if (!isMatch) return res.status(400).json({ message: 'Contraseña incorrecta' });

    if (usingTemp) {
      user.tempPassword = undefined;
      user.tempPasswordExpires = undefined;
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id, tenantId: user.tenantId || null, role: user.role, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.status(200).json({
      message: 'Inicio de sesión exitoso',
      userId: user._id,
      role: user.role,
      tenantId: user.tenantId || null,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Error al iniciar sesión', error: err });
  }
});

// Cerrar sesión
router.post('/logout', authMiddleware, (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });
  res.status(200).json({ message: 'Cierre de sesión exitoso' });
});

// Reset password único
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email es obligatorio' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Usuario no encontrado' });

    const tempPasswordPlain = crypto.randomBytes(4).toString('hex');
    const salt = await bcrypt.genSalt(10);
    user.tempPassword = await bcrypt.hash(tempPasswordPlain, salt);
    user.tempPasswordExpires = new Date(Date.now() + 5 * 60 * 1000);

    await user.save();

    if (user.role === 'admin') {
      return res.json({
        message: 'Contraseña temporal generada para admin',
        tempPassword: tempPasswordPlain,
      });
    } else {
      try {
        await sendResetEmail(user.email, user.name, tempPasswordPlain);
        return res.json({ message: 'Se ha enviado una contraseña temporal a tu correo' });
      } catch (mailError: any) {
        if (mailError.message.includes('invalid_grant')) {
          return res.status(500).json({
            message: 'Error en el envío de correo: token de Google inválido o expirado. Contacta al administrador.',
          });
        }
        throw mailError;
      }
    }
  } catch (error) {
    console.error('Error en reset-password:', error);
    res.status(500).json({ message: 'Error en reset-password', error });
  }
});

// Obtener datos del usuario autenticado
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    res.json({
      _id: user._id,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId || null,
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener perfil', error });
  }
});

// Listar usuarios
router.get('/list', authMiddleware, async (req: AuthRequest, res) => {
  try {
    let users;
    if (req.isAdminGlobal) {
      users = await User.find({ _id: { $ne: req.userId } }).select('-password');
    } else {
      users = await User.find({ tenantId: req.tenantId, _id: { $ne: req.userId } }).select('-password');
    }
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar usuarios', error });
  }
});

// Obtener usuario por ID
router.get('/list/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.params.id === req.userId) {
      return res.status(403).json({ message: 'No puedes ver tu propio usuario' });
    }

    let user;
    if (req.isAdminGlobal) {
      user = await User.findById(req.params.id).select('-password');
    } else {
      user = await User.findOne({ _id: req.params.id, tenantId: req.tenantId }).select('-password');
    }

    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuario', error });
  }
});

// Actualizar usuario (solo admin, excepto sí mismo)
router.put('/update/:id', authMiddleware, roleMiddleware(['admin']), passwordValidator, async (req: AuthRequest, res) => {
  try {
    if (req.userId === req.params.id) {
      return res.status(403).json({ message: 'No puedes actualizar tu propio usuario' });
    }

    const { name, email, password, role, tenantId } = req.body;
    const updateData: any = {};

    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (tenantId) updateData.tenantId = tenantId;

    if (email) {
      const exists = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (exists) return res.status(400).json({ message: 'Email ya está en uso' });
      updateData.email = email;
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
      updateData.tempPassword = undefined;
      updateData.tempPasswordExpires = undefined;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password');

    if (!updatedUser) return res.status(404).json({ message: 'Usuario no encontrado' });

    res.json({ message: 'Usuario actualizado', updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar usuario', error });
  }
});

// Eliminar usuario (solo admin, excepto sí mismo)
router.delete('/delete/:id', authMiddleware, roleMiddleware(['admin']), async (req: AuthRequest, res) => {
  try {
    if (req.userId === req.params.id) {
      return res.status(403).json({ message: 'No puedes eliminar tu propio usuario' });
    }

    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: 'Usuario no encontrado' });

    await Metric.deleteMany({ tenantId: deletedUser.tenantId });

    res.json({ message: 'Usuario eliminado y métricas relacionadas limpiadas' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar usuario', error });
  }
});

// Obtener perfil del usuario autenticado
router.get('/profile/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.userId !== req.params.id) {
      return res.status(403).json({ message: 'No puedes acceder a otro perfil' });
    }
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener perfil', error });
  }
});

// Actualizar perfil (solo el propio usuario)
router.put('/profile/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.userId !== req.params.id) {
      return res.status(403).json({ message: 'No puedes actualizar otro perfil' });
    }

    const { name, email, password } = req.body;
    const updateData: any = {};

    if (name) updateData.name = name;

    if (email) {
      const exists = await User.findOne({ email, _id: { $ne: req.userId } });
      if (exists) return res.status(400).json({ message: 'Email ya está en uso' });
      updateData.email = email;
    }

    if (password) {
    const salt = await bcrypt.genSalt(10);
     updateData.password = await bcrypt.hash(password, salt);
     updateData.tempPassword = undefined;
     updateData.tempPasswordExpires = undefined;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      updateData,
      { new: true }
    ).select('-password');

    if (!updatedUser) return res.status(404).json({ message: 'Usuario no encontrado' });

    res.json({ message: 'Perfil actualizado', updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar perfil', error });
  }
});

// Eliminar perfil (solo el propio usuario)
router.delete('/profile/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.userId !== req.params.id) {
      return res.status(403).json({ message: 'No puedes eliminar otro perfil' });
    }
    const deletedUser = await User.findByIdAndDelete(req.userId);
    if (!deletedUser) return res.status(404).json({ message: 'Usuario no encontrado' });
    await Metric.deleteMany({ tenantId: deletedUser.tenantId });
    res.json({ message: 'Cuenta eliminada' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar perfil', error });
  }
});

export default router;