import app from './app';
import mongoose from 'mongoose';

mongoose.connect(process.env.MONGO_URI || '')
  .then(() => console.log('MongoDB conectado'))
  .catch(err => console.error('Error de conexión con MongoDB:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto: ${PORT}`));