# Privelux — despliegue limpio

Este paquete está preparado para crear un repositorio nuevo y reutilizar la base de datos Neon existente.

## 1. Base de datos

No ejecutes `pnpm --filter @workspace/db push` ni `push-force` durante la migración.
El backend usa `DATABASE_URL` directamente y no ejecuta migraciones al arrancar.

En Render usa exactamente la cadena `DATABASE_URL` de la base Neon que ya usa la tienda actual.

## 2. Render — API

Crear un Web Service nuevo desde la raíz del repositorio.

- Build Command:
  `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server run build`
- Start Command:
  `pnpm --filter @workspace/api-server run start`
- Health Check Path:
  `/api/health`

Variables:
- `DATABASE_URL`: conexión Neon existente.
- `FRONTEND_URL`: URL temporal de Vercel. Puede contener varias URLs separadas por comas.
- `RESEND_API_KEY`: opcional, si se quieren conservar los correos.
- `DASHBOARD_URL`: opcional, por ejemplo `https://tu-dominio/admin`.

Render proporciona `PORT` automáticamente. No hay que crearlo manualmente.

## 3. Vercel — frontend

Importar el repositorio nuevo y usar la raíz del repositorio como Root Directory.
El archivo `vercel.json` ya define:

- Build Command: `pnpm install && pnpm --filter @workspace/privelux run build`
- Output Directory: `artifacts/privelux/dist/public`
- Framework: Other

Añadir una sola variable:
- `VITE_API_URL=https://TU-API.onrender.com`

No crear `PORT` ni `BASE_PATH` en Vercel.

## 4. Conectar Render y Vercel

Cuando Vercel entregue la URL definitiva o temporal, colocarla en `FRONTEND_URL` de Render y redeploy del backend si Render lo solicita.

## 5. Comprobaciones

- API: abrir `https://TU-API.onrender.com/api/health` y comprobar `{"status":"ok",...}`.
- Tienda: abrir la URL de Vercel y comprobar productos/categorías.
- Admin: entrar a `/admin`.

La primera vez que un administrador de la base antigua inicia sesión, el backend convierte automáticamente el hash antiguo de contraseña al formato nuevo y más seguro, sin cambiar tablas ni perder datos.
