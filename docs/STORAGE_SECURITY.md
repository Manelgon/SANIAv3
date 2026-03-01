# Seguridad de Storage — SanIA
## Documentos de Pacientes: Bucket Privado + Edge Function

---

## Índice

1. [Arquitectura general](#1-arquitectura-general)
2. [Por qué no signed URLs largas](#2-por-qué-no-signed-urls-largas)
3. [Cómo funciona el flujo completo](#3-cómo-funciona-el-flujo-completo)
4. [Edge Function: sign-storage-url](#4-edge-function-sign-storage-url)
5. [Frontend: lib/storage.ts](#5-frontend-libstoragerts)
6. [Base de datos: cambios de esquema](#6-base-de-datos-cambios-de-esquema)
7. [Cómo desplegar la Edge Function (Supabase CLI)](#7-cómo-desplegar-la-edge-function-supabase-cli)
8. [Cómo ejecutar la migración SQL](#8-cómo-ejecutar-la-migración-sql)
9. [Cómo hacer el bucket privado](#9-cómo-hacer-el-bucket-privado)
10. [Consultas de auditoría RGPD](#10-consultas-de-auditoría-rgpd)
11. [Checklist de producción](#11-checklist-de-producción)
12. [Referencia rápida de errores](#12-referencia-rápida-de-errores)

---

## 1. Arquitectura general

```
┌─────────────────────────────────────────────────────────────────┐
│  NAVEGADOR (Frontend React)                                      │
│                                                                  │
│  DocumentsTab / ConsultationPanel / UploadTestModal             │
│       │                                                          │
│       │  POST /functions/v1/sign-storage-url                    │
│       │  { path, expiresIn, purpose }   ← bucket NO se envía   │
│       │  Authorization: Bearer <JWT de sesión>                  │
│       ▼                                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  EDGE FUNCTION (Deno, Supabase)                          │   │
│  │                                                          │   │
│  │  1. Verifica JWT del usuario                             │   │
│  │  2. Valida path (no .., no /, estructura UUID/archivo)   │   │
│  │  3. Clamp expiresIn por purpose (ui=900s, auto=3600s)    │   │
│  │  4. Carga rol del usuario (super_admin / practitioner)   │   │
│  │  5. Busca documento en patient_documents por path        │   │
│  │  6. Si practitioner: verifica que sea su paciente        │   │
│  │  7. Genera signed URL con service_role                   │   │
│  │  8. Guarda log RGPD (no bloqueante)                      │   │
│  │  9. Devuelve { signedUrl, expiresIn }                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│       │                                                          │
│       │  signedUrl (válida 15 min o 1h)                         │
│       ▼                                                          │
│  window.open(signedUrl) / fetch(signedUrl)                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  BASE DE DATOS (Supabase PostgreSQL)                             │
│                                                                  │
│  patient_documents                                               │
│  ├── storage_bucket  TEXT  ('patient-documents')                │
│  ├── storage_path    TEXT  ('{patient_id}/{archivo}.pdf')       │
│  └── url             TEXT  NULL  (legacy, solo docs antiguos)   │
│                                                                  │
│  document_access_logs                                            │
│  ├── user_id, document_id, patient_id                           │
│  ├── purpose ('ui' | 'automation')                              │
│  ├── ip_address, user_agent                                     │
│  └── accessed_at                                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  STORAGE (Supabase)                                              │
│                                                                  │
│  bucket: patient-documents   ← PRIVADO (Public: OFF)           │
│  ├── {patient_id}/ANALITICA_1740000000.pdf                      │
│  ├── {patient_id}/TAC_1740000001.pdf                            │
│  └── {patient_id}/1740000002_consulta.pdf                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Por qué no signed URLs largas

En sanidad, una signed URL larga (ej. 10 años) es equivalente a una URL pública:
- Si se filtra por email, screenshot, log de servidor o middleware → acceso permanente al documento
- No hay forma de revocarla una vez emitida
- Incumple el principio de mínimo acceso (RGPD Art. 25)

**Patrón correcto:**

| Caso de uso | Duración | Quién genera |
|---|---|---|
| Ver / Descargar en UI | 15 min (900 s) | Edge Function, purpose `ui` |
| Enviar a n8n / IA | 1 hora (3600 s) | Edge Function, purpose `automation` |
| Guardar en BD | Nunca | Se guarda `storage_path`, no URL |

---

## 3. Cómo funciona el flujo completo

### Subir un documento (ej. Analítica)

```
1. Usuario hace clic en "Subir Resultado/Prueba"
2. Selecciona tipo: Analítica
3. Adjunta archivo PDF
4. UploadTestModal.tsx:
   - Sube el archivo a Storage: patient-documents/{patient_id}/ANALITICA_1740000.pdf
   - Guarda en patient_documents:
       storage_bucket = 'patient-documents'
       storage_path   = '{patient_id}/ANALITICA_1740000.pdf'
       url            = null   ← ya no guarda URL
```

### Ver / Descargar un documento

```
1. Usuario hace clic en "Ver" o "Descargar"
2. DocumentsTab llama a viewDocument(doc) o downloadDocument(doc)
3. storage.ts → getSignedUrlForDoc(doc, 900, 'ui')
4. Se hace POST a la Edge Function con:
   { path: '{patient_id}/ANALITICA_1740000.pdf', expiresIn: 900, purpose: 'ui' }
   Authorization: Bearer eyJ...
5. Edge Function verifica JWT, rol, existencia en BD, acceso
6. Genera signed URL válida 15 min
7. El navegador abre / descarga el archivo con esa URL temporal
8. La URL expira a los 15 min — si se filtra, no sirve de nada
```

### Análisis IA (webhook n8n)

```
1. Usuario selecciona documentos y hace clic en "Análisis IA"
2. DocumentsTab llama a getAutomationUrl(doc) por cada documento
3. storage.ts → getSignedUrlForDoc(doc, 3600, 'automation')
4. Edge Function genera signed URLs de 1 hora
5. Se envía al webhook el payload JSON con signed_url de cada doc
6. n8n / IA descarga los archivos con esas URLs durante la siguiente hora
7. El resultado vuelve, se genera PDF y se guarda en Storage (con storage_path, no URL)
```

---

## 4. Edge Function: sign-storage-url

**Ubicación:** `supabase/functions/sign-storage-url/index.ts`

### Parámetros de entrada (POST JSON)

```json
{
  "path":      "{patient_id}/{archivo}.pdf",
  "expiresIn": 900,
  "purpose":   "ui"
}
```

> **Nota:** `bucket` NO se envía desde el cliente. Está fijo en el servidor como `'patient-documents'`.

### Parámetros de salida

```json
{
  "signedUrl": "https://nzlhyz...supabase.co/storage/v1/object/sign/patient-documents/...",
  "expiresIn": 900
}
```

### Seguridad implementada

#### 1. Autenticación JWT
```typescript
const userClient = createClient(supabaseUrl, anonKey, {
  global: { headers: { Authorization: authHeader } },
});
const { data: { user } } = await userClient.auth.getUser();
// Sin JWT válido → 401
```

#### 2. Validación de path
```typescript
function isPathSafe(path: string): boolean {
  if (path.includes('..')) return false;      // no path traversal
  if (path.startsWith('/'))  return false;    // no root paths
  // debe ser {uuid}/{filename}
  if (!/^[0-9a-f\-]{36}\/[^\s]{1,300}$/i.test(path)) return false;
  return true;
}
```

#### 3. Límites de expiración por purpose

```typescript
const EXPIRES = {
  ui:         900,   // 15 min — ver/descargar en navegador
  automation: 3600,  // 1 h    — n8n / IA
};
// El servidor impone el máximo, el cliente no puede saltárselo
const clampedExpiry = Math.min(Math.max(30, expiresIn), maxForPurpose);
```

#### 4. Autorización basada en BD
```typescript
// El documento DEBE existir en patient_documents con ese path exacto
// Esto evita que alguien firme paths arbitrarios que existan en Storage
const { data: doc } = await adminClient
  .from('patient_documents')
  .select('id, patient_id, practitioner_id')
  .eq('storage_bucket', 'patient-documents')
  .eq('storage_path', path)
  .maybeSingle();

if (!doc) return json({ error: 'Document not found' }, 404);
```

#### 5. Autorización de practitioners
```typescript
// El practitioner solo puede acceder a documentos de SUS pacientes
// (vinculados mediante portfolio_patients → portfolios → practitioners)
if (profile.role === 'practitioner') {
  const { count } = await adminClient
    .from('portfolio_patients')
    .select('*', { count: 'exact', head: true })
    .eq('patient_id', doc.patient_id)
    .in('portfolio_id', [...portfoliosDelPractitioner]);

  if (!count || count === 0) return json({ error: 'Forbidden: not your patient' }, 403);
}
```

#### 6. Log RGPD (no bloqueante)
```typescript
adminClient.from('document_access_logs').insert({
  user_id, document_id, patient_id,
  bucket, path, purpose,
  expires_in, ip_address, user_agent,
}).then(() => {}).catch(console.error);
// No bloquea la respuesta; si falla el log, la URL se sigue devolviendo
```

---

## 5. Frontend: lib/storage.ts

**Ubicación:** `frontend/src/lib/storage.ts`

### Funciones disponibles

#### `extractStorageRef(url)` — Parsear cualquier URL de Supabase Storage

```typescript
// Maneja todos los formatos:
// /storage/v1/object/public/<bucket>/<path>
// /storage/v1/object/sign/<bucket>/<path>?token=...
// /storage/v1/object/<bucket>/<path>

const ref = extractStorageRef('https://...supabase.co/storage/v1/object/public/patient-documents/abc/file.pdf');
// → { bucket: 'patient-documents', path: 'abc/file.pdf' }
```

#### `resolveStorageRef(doc)` — Compatibilidad con documentos legacy

```typescript
// Para documentos NUEVOS: usa storage_bucket + storage_path
// Para documentos LEGACY: parsea el campo url
// Si nada está disponible: devuelve null

const ref = resolveStorageRef({
  storage_bucket: 'patient-documents',
  storage_path: 'abc/file.pdf',
  url: null,
});
// → { bucket: 'patient-documents', path: 'abc/file.pdf' }
```

#### `getSignedUrl(path, expiresIn, purpose)` — Llamada al Edge Function

```typescript
// Nunca envía bucket (fijo en servidor)
// Nunca usa service_role en el navegador

const url = await getSignedUrl('abc/file.pdf', 900, 'ui');
```

#### `getSignedUrlForDoc(doc, expiresIn, purpose)` — Helper para objetos documento

```typescript
const url = await getSignedUrlForDoc(doc, 900, 'ui');
```

#### `viewDocument(doc)` — Abrir en nueva pestaña (15 min, purpose ui)

```typescript
await viewDocument(doc); // purpose: 'ui', expira en 15 min
```

#### `downloadDocument(doc)` — Descargar (15 min, purpose ui)

```typescript
await downloadDocument(doc); // purpose: 'ui', expira en 15 min
```

#### `getAutomationUrl(doc)` — URL para webhook n8n/IA (1h, purpose automation)

```typescript
const url = await getAutomationUrl(doc); // purpose: 'automation', expira en 1h
```

---

## 6. Base de datos: cambios de esquema

### Tabla `patient_documents` — columnas añadidas

```sql
ALTER TABLE public.patient_documents
  ADD COLUMN storage_bucket TEXT DEFAULT 'patient-documents',
  ADD COLUMN storage_path   TEXT,    -- '{patient_id}/{archivo}.pdf'
  ADD COLUMN title          TEXT,
  ADD COLUMN document_type  TEXT;

-- url pasa a ser nullable (documentos nuevos no la usan)
ALTER TABLE public.patient_documents
  ALTER COLUMN url DROP NOT NULL;
```

**Regla:**
- Documentos **nuevos** → `storage_path` relleno, `url = null`
- Documentos **legacy** → `url` relleno con URL pública o firmada antigua, `storage_path` extraído por backfill

### Tabla `document_access_logs` — nueva

```sql
CREATE TABLE public.document_access_logs (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        REFERENCES auth.users(id),
  document_id UUID        REFERENCES patient_documents(id),
  patient_id  UUID        REFERENCES patients(id),
  bucket      TEXT        NOT NULL,
  path        TEXT        NOT NULL,
  purpose     TEXT        NOT NULL DEFAULT 'ui',   -- 'ui' | 'automation'
  expires_in  INTEGER     NOT NULL,
  ip_address  TEXT,
  user_agent  TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 7. Cómo desplegar la Edge Function (Supabase CLI)

### Paso 1: Instalar Supabase CLI

```powershell
npm install -g supabase
supabase --version   # verificar instalación
```

### Paso 2: Autenticarse y vincular el proyecto

```powershell
# Desde la raíz del workspace:
cd "c:\Users\manel\000.SANIAN copia"

supabase login
# Abre el navegador. Autoriza con tu cuenta de Supabase.

supabase link --project-ref nzlhyzfdseteoobvcvip
# nzlhyzfdseteoobvcvip es el Project Reference ID
# (Supabase → Settings → General → Reference ID)
```

### Paso 3: Desplegar la función

```powershell
supabase functions deploy sign-storage-url
```

La CLI busca automáticamente `supabase/functions/sign-storage-url/index.ts`.

### Paso 4: Verificar en el dashboard

- Supabase → **Edge Functions** → debería aparecer `sign-storage-url` como activa
- Hacer clic en la función → **Logs** para ver peticiones en tiempo real

### Variables de entorno

La Edge Function usa estas variables que Supabase inyecta automáticamente:

| Variable | Descripción |
|---|---|
| `SUPABASE_URL` | URL del proyecto |
| `SUPABASE_ANON_KEY` | Clave pública (para verificar JWTs de usuarios) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave privada (para generar signed URLs) |

No hay que configurarlas manualmente. Si por algún motivo no llegan, ir a:
Supabase → Edge Functions → `sign-storage-url` → **Secrets**

### Republicar tras cambios en el código

```powershell
supabase functions deploy sign-storage-url
```

---

## 8. Cómo ejecutar la migración SQL

**Archivo:** `backend/migrations/001_storage_path.sql`

1. Ir a **Supabase → SQL Editor**
2. Pegar y ejecutar el contenido del archivo
3. Verificar que no haya errores

O alternativamente, ejecutar solo las líneas críticas si la tabla ya existe:

```sql
-- Añadir columnas nuevas
ALTER TABLE public.patient_documents
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'patient-documents',
  ADD COLUMN IF NOT EXISTS storage_path   TEXT,
  ADD COLUMN IF NOT EXISTS title          TEXT,
  ADD COLUMN IF NOT EXISTS document_type  TEXT;

-- Hacer url nullable
ALTER TABLE public.patient_documents
  ALTER COLUMN url DROP NOT NULL;

-- Backfill storage_path desde URLs legacy
UPDATE public.patient_documents
SET
  storage_bucket = 'patient-documents',
  storage_path   = regexp_replace(
                     regexp_replace(url, '^.*/patient-documents/', ''),
                     '\?.*$', ''
                   )
WHERE storage_path IS NULL
  AND url IS NOT NULL
  AND url NOT IN ('#', '', 'null');
```

---

## 9. Cómo hacer el bucket privado

1. Ir a **Supabase → Storage**
2. Hacer clic en el bucket **patient-documents**
3. Ir a **Settings** (engranaje o pestaña de configuración)
4. Desmarcar **"Public bucket"**
5. Guardar

A partir de ese momento:
- Las URLs públicas antiguas dejarán de funcionar
- Solo funcionarán las signed URLs generadas por la Edge Function
- El frontend ya usa `storage.ts` que llama a la Edge Function, por lo que no hay rotura

---

## 10. Consultas de auditoría RGPD

### Ver los últimos accesos a documentos

```sql
SELECT
  u.email,
  dal.purpose,
  pd.title,
  pd.storage_path,
  dal.ip_address,
  dal.accessed_at
FROM document_access_logs dal
LEFT JOIN auth.users u         ON u.id  = dal.user_id
LEFT JOIN patient_documents pd ON pd.id = dal.document_id
ORDER BY dal.accessed_at DESC
LIMIT 50;
```

### Accesos a documentos de un paciente concreto

```sql
SELECT *
FROM document_access_logs
WHERE patient_id = '{patient_id}'
ORDER BY accessed_at DESC;
```

### Todas las llamadas de automatización (n8n/IA)

```sql
SELECT *
FROM document_access_logs
WHERE purpose = 'automation'
ORDER BY accessed_at DESC;
```

### Accesos de un usuario en las últimas 24h

```sql
SELECT *
FROM document_access_logs
WHERE user_id = '{user_id}'
  AND accessed_at > NOW() - INTERVAL '24 hours'
ORDER BY accessed_at DESC;
```

---

## 11. Checklist de producción

- [x] Bucket `patient-documents` → privado
- [x] Edge Function `sign-storage-url` desplegada
- [x] Migración `001_storage_path.sql` ejecutada
- [x] `url` nullable en `patient_documents`
- [x] Backfill de `storage_path` para documentos existentes
- [x] Frontend nunca usa `service_role` ni genera signed URLs directamente
- [x] Documentos nuevos guardan `storage_bucket` + `storage_path`, `url = null`
- [x] `purpose: 'ui'` → máx. 15 min; `purpose: 'automation'` → máx. 1 h
- [x] Autorización por DB: no se puede firmar un path sin registro en `patient_documents`
- [x] Practitioners solo acceden a documentos de sus pacientes
- [x] Log RGPD con `user_id`, `document_id`, `patient_id`, `purpose`, `ip`, `user_agent`

---

## 12. Referencia rápida de errores

| Error en consola | Causa | Solución |
|---|---|---|
| `null value in column "url" violates not null constraint` | La columna `url` tiene `NOT NULL` en BD | Ejecutar `ALTER TABLE patient_documents ALTER COLUMN url DROP NOT NULL;` |
| `sign-storage-url failed: 404` | El documento no existe en `patient_documents` con ese `storage_path` | Verificar que el backfill se ejecutó correctamente |
| `sign-storage-url failed: 403` | El practitioner no tiene acceso al paciente | Verificar `portfolio_patients` en BD |
| `sign-storage-url failed: 401` | JWT no válido o sesión expirada | El usuario debe volver a iniciar sesión |
| `sign-storage-url failed: 400` | `path` vacío o con formato incorrecto | Verificar que `storage_path` en BD tiene formato `{uuid}/{archivo}` |
| `Could not generate signed URL` (500) | Error al llamar a Supabase Storage | Verificar que el bucket existe y la `SUPABASE_SERVICE_ROLE_KEY` es válida |
