---
page: perfil-facultativo
---
Pantalla de Perfil del Facultativo para el Panel de SanIA. Desktop layout.

Esta es la pantalla que ve un facultativo al hacer clic en "Perfil" en la barra de navegación.
Debe mostrar los datos personales del facultativo con opción de editarlos, junto con información profesional.

**SANIA DESIGN SYSTEM (estética actual del app):**
- Color mode: Light
- Primary color: Deep Forest Teal (#0f4d40) — headings, CTAs, active nav, icon containers
- Accent color: Agua Celestial (#BDF7EB) — active tab underlines, secondary button hover, hero gradients
- Mid-tone: Soft Aquamarine (#7ed8c8) — gradient transitions, hover backgrounds
- Page background: #f6f8f7 (barely-mint off-white)
- Card background: White with slate-200 border and shadow-sm
- Font: Inter (Google Fonts), weights 400/500/600/700/800
- Icons: Google Material Symbols Outlined
- Corner rounding: 8px inputs/buttons (rounded-lg), 12px cards (rounded-xl)
- Primary button: bg-primary (#0f4d40) text-white rounded-lg shadow-md
- Secondary button: bg-accent/20 hover:bg-accent text-primary rounded-lg
- Active tab: border-b-4 border-accent (#BDF7EB) text-primary font-bold
- Alert/Warning: red-600 text with red-50 background
- All text in Spanish
- Professional medical/clinical aesthetic — calm authority, not cold

**Page Structure:**

1. PAGE HEADER:
   - H1: "Mi Perfil" (2xl font-bold slate-900)
   - Subtitle: "Gestiona tu información personal y profesional"

2. PROFILE CARD (top, full-width, white rounded-xl):
   - Left: Large avatar circle (bg-brand-600, white initials 'JG', 80px)
   - Upload photo button below avatar
   - Right: Name "Dr. Juan García Martín", Especialidad: "Cardiología Avanzada", 
     Nº Colegiado: "28/123456-MD", Estado badge: "Activo" (green)
   - Far right: "Editar Perfil" button (outline)

3. TWO-COLUMN LAYOUT:

   LEFT COLUMN (2/3):
   - Card "Información Personal":
     * Nombre y Apellidos (two inputs: Nombre, Apellido 1, Apellido 2)
     * DNI/NIE (input, disabled)
     * Email profesional (input)
     * Teléfono de contacto (input)
     * Fecha de nacimiento (date input)

   - Card "Información Profesional":
     * Especialidad médica (select/input)
     * Nº de Colegiado (input)
     * FID/Hospital (read-only badge)
     * Años de experiencia (number input)

   RIGHT COLUMN (1/3):
   - Card "Seguridad y Acceso":
     * Campo "Contraseña actual" + "Nueva contraseña" + "Confirmar"
     * Botón "Cambiar contraseña" (outline)
     * Separador
     * "Último acceso: hace 2 horas" (text-xs slate-400)
     * "Sesiones activas: 1 dispositivo" 

   - Card "Preferencias":
     * Toggle "Notificaciones de nuevas consultas" (on)
     * Toggle "Emails de resumen semanal" (off)
     * Toggle "Modo oscuro" (off, disabled with 'Próximamente' badge)
