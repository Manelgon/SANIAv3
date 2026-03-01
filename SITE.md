# SITE.md — SanIA Sistema Médico

## 1. Visión del Producto

SanIA es una aplicación web de gestión clínica multi-rol. Permite a **facultativos** gestionar carteras de pacientes y consultas, a **administradores** supervisar el sistema completo, y a **pacientes** acceder a su información médica desde un portal propio.

**Stack técnico:** React 19 + TypeScript + Vite + Tailwind CSS 4 + Supabase (PostgreSQL)  
**Color brand principal:** Agua Celestial (#BDF7EB)  
**Idioma:** Español  
**Despliegue:** Vercel

---

## 2. Stitch Project

- **Project ID:** `6978231519022108608`
- **Project Name:** `projects/6978231519022108608`
- **Stitch URL:** https://stitch.withgoogle.com/projects/6978231519022108608

---

## 3. Roles y Flujos de Navegación

| Rol | Ruta | Descripción |
|-----|------|-------------|
| `super_admin` | `/admin/*` | Panel de administración con sidebar teal oscuro |
| `practitioner` | `/dashboard/*` | Dashboard con header KPIs + tabs de navegación |
| `patient` | `/portal` | Portal de salud personal del paciente |

---

## 4. Sitemap — Pantallas Diseñadas

- [x] **Login** — `queue/login.html` — Pantalla de inicio de sesión con split layout ✅ aplicado
- [x] **Practitioner Dashboard / Mis Carteras** — `queue/dashboard.html` — Vista principal del facultativo ✅ aplicado
- [x] **Patient Portal** — `queue/portal.html` — Portal del paciente con consultas y documentos ✅ aplicado
- [x] **Admin Panel / Gestión de Usuarios** — `queue/admin.html` — Panel de administración con tabla de usuarios ✅ aplicado
- [x] **Detalle de Paciente** — `queue/patient-detail.html` — Vista clínica completa del paciente con timeline
- [x] **Panel Clínico del Paciente (6 tabs)** — `queue/patient-panel.html` — Panel con Resumen General, Consulta, Historial, Datos Clínicos, Diagnósticos, Documentos ✅ aplicado
- [x] **Mis Pacientes (Lista)** — `queue/patients-list.html` — Lista de pacientes con tabla y búsqueda ✅ estilo confirmado

---

## 5. Roadmap — Pantallas Pendientes

- [x] **Vista detalle de paciente** — Historial médico completo, consultas, diagnósticos, documentos
- [x] **Panel de Paciente con tabs** — Pestaña Resumen General + tab Consulta por defecto
- [x] **Lista Mis Pacientes estilo admin** — Tabla con avatar, badges, búsqueda
- [ ] **Perfil del Facultativo** — ← PRÓXIMO en next-prompt.md
- [ ] **Mis Pacientes (Facultativo)** — Refinamiento visual de la lista
- [ ] **Perfil del Facultativo** — Edición de datos personales, especialidad, foto de perfil
- [ ] **Gestión de Facultativos (Admin)** — Tabla de facultativos con detalle expandible
- [ ] **Gestión de Pacientes (Admin)** — Tabla de pacientes con búsqueda avanzada
- [ ] **Gestión de Carteras (Admin)** — Vista de todas las carteras del sistema
- [ ] **Recuperación de Contraseña** — Pantalla de reset password (update-password route)
- [ ] **Portal Paciente — Detalle de Consulta** — Vista expandida de una consulta con PDF export

---

## 6. Ideas de Mejora UX (Creative Freedom)

Ideas para iterar en el diseño con Stitch:

- **Notificaciones en tiempo real** — Panel de notificaciones deslizable desde el header (campana)
- **Onboarding flow** — Wizard de bienvenida para nuevos facultativos
- **Dashboard con gráficas** — Evolución de pacientes a lo largo del tiempo (area chart, mini-sparklines)
- **Vista Kanban de carteras** — Alternativa visual drag-and-drop a la vista de grid
- **Consulta con asistencia IA** — Panel lateral de sugerencias de diagnóstico con badge "IA"
- **Modo oscuro** — Versión dark mode de todas las pantallas
- **App móvil (mobile version)** — Rediseño responsive para smartphone del portal del paciente
- **Página de error 404** — Pantalla de error con branding SanIA
- **Loading states** — Skeleton loaders con animación teal para las listas de datos

---

## 7. Convenciones de Prompts

Al generar nuevas pantallas con Stitch, incluir siempre el bloque de diseño de la Sección 6 de `DESIGN.md` en el prompt.

**Device type:** DESKTOP para todas las pantallas de admin/practitioner, MOBILE para portal de pacientes versión móvil.
