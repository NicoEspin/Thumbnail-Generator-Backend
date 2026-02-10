# Thumblify Backend

Backend (API) para Thumblify: autenticacion con sesiones, generacion de thumbnails con Gemini (imagenes) y almacenamiento en MongoDB + Cloudinary.

## Stack

- Node.js + TypeScript (ESM)
- Express
- MongoDB + Mongoose
- express-session + connect-mongo (sesiones persistidas en Mongo)
- Multer (subida de imagenes en memoria, hasta 2 referencias)
- Cloudinary (hosting de imagenes)
- @google/genai (Gemini)

## Estructura del proyecto

- `src/server.ts`: bootstrap del server, CORS, sesiones y routers
- `src/config/db.ts`: conexion a Mongo
- `src/config/ai.ts`: cliente de Gemini
- `src/routes/*.routes.ts`: definicion de endpoints
- `src/controllers/*.controller.ts`: logica de negocio
- `src/middlewares/auth.ts`: middleware de proteccion por sesion
- `src/middlewares/uploadReferenceImages.ts`: middleware Multer (campo `reference_images`)
- `src/models/*.ts`: modelos Mongoose (`User`, `Thumbnail`)

## Requisitos

- Node.js (recomendado 18+)
- MongoDB (local o Atlas)
- Cuenta de Cloudinary
- API key de Google Gemini

## Configuracion (variables de entorno)

Crea un archivo `.env` en la raiz (no lo subas al repo):

```env
# Server
PORT=3000
SESSION_SECRET=change-me

# Mongo
MONGO_URI=mongodb://...

# Gemini
GOOGLE_API_KEY=...

# Cloudinary (forma recomendada por esta base)
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
```

Notas:

- En este codigo, Gemini se lee desde `process.env.GOOGLE_API_KEY` (ver `src/config/ai.ts`). Si tu `.env` tiene `GEMINI_API_KEY`, renombralo a `GOOGLE_API_KEY`.
- Cloudinary se usa via `CLOUDINARY_URL` (no hay `cloudinary.config(...)` en el codigo).

## Instalacion y ejecucion

```bash
npm install
npm run dev
```

El server levanta por defecto en `http://localhost:3000`.

Scripts disponibles (ver `package.json`):

- `npm run dev`: servidor en modo desarrollo (nodemon + tsx)
- `npm run build`: compila TypeScript a `dist/`

Ejecucion "produccion" (una vez compilado):

```bash
npm run build
node dist/src/server.js
```

## CORS y sesiones

- CORS permite `http://localhost:5173` y `http://127.0.0.1:5173` con `credentials: true`.
- La autenticacion es por cookie de sesion (no JWT). En frontend, usa `credentials: 'include'`.

## API

Base URL: `http://localhost:3000`

### Health

- `GET /` -> `Server is Live!`

### Auth (`/api/auth`)

- `POST /api/auth/register`
  - body JSON: `{ "name": string, "email": string, "password": string }`
  - crea usuario y deja sesion iniciada

- `POST /api/auth/login`
  - body JSON: `{ "email": string, "password": string }`
  - inicia sesion

- `GET /api/auth/verify` (protegido)
  - devuelve el usuario (sin password) si hay sesion valida

- `POST /api/auth/logout` (protegido)
  - destruye la sesion

Ejemplo con cookies (curl):

```bash
# Register (guarda cookie)
curl -i -c cookies.txt http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Nico","email":"nico@example.com","password":"123456"}'

# Verify (manda cookie)
curl -i -b cookies.txt http://localhost:3000/api/auth/verify
```

### Thumbnails (`/api/thumbnail`)

- `POST /api/thumbnail/generate` (protegido)
  - Content-Type: `multipart/form-data`
  - campos:
    - `title` (string, requerido)
    - `prompt` (string, opcional) -> detalles extra
    - `style` (requerido): `Bold & Graphic` | `Tech/Futuristic` | `Minimalist` | `Photorealistic` | `Illustrated`
    - `aspect_ratio` (opcional): `16:9` | `1:1` | `9:16`
    - `color_scheme` (opcional): `vibrant` | `sunset` | `forest` | `neon` | `purple` | `monochrome` | `ocean` | `pastel`
    - `text_overlay` (opcional, boolean)
    - `reference_hint` (opcional) -> hint sobre las referencias (ej: `img1=person,img2=background`)
  - archivos:
    - `reference_images`: hasta 2 imagenes (`png|jpg|jpeg|webp`), max 6MB cada una
  - flujo:
    - sube referencias a Cloudinary
    - genera imagen con Gemini
    - sube resultado a Cloudinary y guarda en Mongo

- `DELETE /api/thumbnail/:id` (protegido)
  - borra un thumbnail del usuario

- `PATCH /api/thumbnail/:id/visibility` (protegido)
  - body JSON: `{ "isPublic": boolean }`
  - marca/desmarca el thumbnail para aparecer en la comunidad

Ejemplo `generate` (curl):

```bash
curl -i -b cookies.txt -c cookies.txt http://localhost:3000/api/thumbnail/generate \
  -F "title=Como aprender Node.js" \
  -F "prompt=incluye un personaje sorprendido y un fondo limpio" \
  -F "style=Bold & Graphic" \
  -F "aspect_ratio=16:9" \
  -F "color_scheme=vibrant" \
  -F "text_overlay=true" \
  -F "reference_images=@./ref1.png" \
  -F "reference_images=@./ref2.jpg"
```

### Comunidad (publico)

- `GET /api/thumbnail/community`
  - query params:
    - `page` (default 1)
    - `limit` (default 24, max 60)
    - filtros: `style`, `aspect_ratio`, `color_scheme`, `text_overlay`, `q` (busca por titulo)
  - devuelve thumbnails publicos, ya generados

- `GET /api/thumbnail/community/:id`
  - devuelve un thumbnail publico por id

Ejemplo:

```bash
curl "http://localhost:3000/api/thumbnail/community?page=1&limit=12&q=node"
```

### Usuario (`/api/user`)

- `GET /api/user/thumbnails` (protegido)
  - lista thumbnails del usuario (ordenados por `createdAt` desc)

- `GET /api/user/thumbnails/:id` (protegido)
  - obtiene un thumbnail del usuario por id

## Modelo de datos (Mongo)

`User` (`src/models/User.ts`):

- `name`, `email` (unico), `password` (bcrypt)

`Thumbnail` (`src/models/Thumbnail.ts`):

- `userId`, `title`, `style`, `aspect_ratio`, `color_scheme`, `text_overlay`
- `reference_images` (0..2 URLs)
- `image_url` (resultado en Cloudinary)
- `prompt_used` y `user_prompt`
- `isGenerating` (estado) e `isPublic` (comunidad)

## Troubleshooting

- `401 Unauthorized`: falta cookie de sesion; en frontend usa `credentials: 'include'`.
- Cloudinary falla: valida `CLOUDINARY_URL`.
- Mongo no conecta: valida `MONGO_URI` y acceso a tu cluster.
- Gemini falla: valida `GOOGLE_API_KEY` y el modelo configurado en `src/controllers/Thumbnail.controller.ts`.

## Seguridad

- No subas `.env` ni claves al repositorio; rota las claves si ya se expusieron.
- Para produccion, revisa flags de cookie (`secure`, `sameSite`) y configura CORS segun tu dominio.
