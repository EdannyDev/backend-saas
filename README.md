# 🚀SaaS de KPIs - Backend

## 📌Descripción
Este es el **backend** del sistema **SaaS de KPIs y gestión de startups**.  
Permite la gestión de usuarios, tenants (startups) y métricas, con roles automáticos asignados según el dominio del correo electrónico del usuario.  

**Funcionalidades principales:**
- Registro, login y gestión de usuarios con seguridad (JWT, Cookies HttpOnly, Bcryptjs).  
- Asignación automática de roles según el email.  
- CRUD completo para **tenants**, **usuarios** y **métricas** con control de permisos por roles.  
- Validación de datos y seguridad en todas las rutas.  
- Envío de correos para restablecimiento de contraseñas temporales (Gmail + OAuth2).

## 🛠️Tecnologías utilizadas

- **Node.js + TypeScript**  
- **Express** (API REST)  
- **MongoDB / Mongoose** (Base de datos NoSQL y modelado de datos) 
- **JWT + Cookies HttpOnly** (Autenticación)  
- **Bcryptjs** (Hash de contraseñas)  
- **Crypto** (Generación de contraseñas temporales)  
- **CORS** (Permitir solicitudes desde el frontend)  
- **dotenv** (Variables de entorno)  
- **Google APIs / Nodemailer** (Envio de emails)  
- **Jest + Supertest** (Testing)  
- **npm** (Gestión de paquetes)  

## ⚙️Instalación y ejecución

```bash
# 1. Clonar el repositorio
git clone https://github.com/EdannyDev/saas-kpis-backend.git

# 2. Instalar dependencias
npm install

# 3. Configuración de variables de entorno
Crea un archivo .env en la raíz con las siguientes variables:

PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/saasDB
JWT_SECRET=tu_secreto_jwt
GOOGLE_CLIENT_ID=tu_client_id_google
GOOGLE_CLIENT_SECRET=tu_client_secret_google
GOOGLE_REFRESH_TOKEN=tu_refresh_token_google
GOOGLE_EMAIL=tu_email

Reemplaza los valores por unos reales

# 4. Ejecutar la aplicación
npm start

# 5. La API estará disponible en:
http://localhost:5000

```

## ✨Endpoints principales
- Usuarios: `/api/users`
- Tenants (Empresas / Startups): `/api/tenants`
- Métricas: `/api/metrics`

## 🔗Enlaces útiles
Frontend: https://github.com/EdannyDev/saas-app