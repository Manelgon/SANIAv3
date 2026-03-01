# Design System: Carrusel Instagram — 000.AUTOMATIZALO

Estilo inspirado en el carrusel de **@guille.colladomk** (Guille Collado), adaptado para el proyecto **000.AUTOMATIZALO** (automatización de negocios).

---

## 1. Tema visual y atmósfera

El carrusel transmite **impacto y claridad**: pósters tipo “slide” con fondo sólido o textura papel, tipografía grande y contrastada, mensajes directos. Sensación de contenido educativo y enganchador para redes.

- **Densidad:** Baja en cada slide; un mensaje claro por diapositiva.
- **Ritmo:** Alternancia entre slides de “portada” (fondo naranja/terracota) y slides de “contenido” (fondo crema/beige con textura).

---

## 2. Paleta de colores

| Nombre            | Hex        | Uso |
|-------------------|------------|-----|
| **Terracota / Naranja** | `#C45C26` / `#D35400` | Fondos de portada y CTA, bloques de énfasis, títulos impactantes |
| **Amarillo**      | `#F1C40F`  | Título principal en slide 1 (contraste sobre terracota) |
| **Crema / Beige** | `#F8F4F0` / `#F5F0E8` | Fondo de slides de contenido, con textura sutil tipo papel |
| **Negro**         | `#000000`  | Texto cuerpo, labels |
| **Blanco**        | `#FFFFFF`  | Texto sobre bloques rojos/naranjas, CTAs |
| **Rojo anaranjado** | `#E74C3C` | Palabras clave, subrayados, flechas, “grunge” |

---

## 3. Tipografía

- **Títulos grandes (impacto):** Sans-serif en negrita, mayúsculas, condensada (estilo Montserrat Black / Impact). Color naranja/rojo o amarillo según fondo.
- **Subtítulos / script:** Fuente cursiva o manuscrita (Dancing Script, Caveat) para “nueva”, “fórmula”, “demasiado pronto”, etc.
- **Cuerpo:** Sans-serif limpia (Inter, system-ui), negro, peso normal o semibold.
- **Jerarquía:** Título > palabra clave resaltada (color + subrayado/tachado) > cuerpo.

---

## 4. Componentes por tipo de slide

### Slide portada (ej. 1 y 10)
- Fondo: color sólido terracota/naranja, ligera textura de grano.
- Título principal: muy grande, amarillo o blanco, mayúsculas.
- Línea superior en script: “Cómo hacer” / “Comenta”.
- Contexto: “PARA INSTAGRAM” / “AUTOMATIZA” en blanco o negro, tamaño medio.

### Slide contenido (ej. 2, 4, 5, 8)
- Fondo: crema/beige con textura papel.
- Título de sección: “EL PROBLEMA”, “POR QUÉ?”, “La NECESIDAD” en naranja/rojo, grande.
- Cuerpo en negro; palabras clave en naranja, cursiva o subrayado.
- Opcional: flechas curvadas rojas para guiar la lectura.

### Slide fórmula / lista (ej. 3, 7, 9)
- Caja roja/naranja con ítems en bandas blancas (ej. “gancho”, “valor”, “CTA” o “1. Gancho (3-5s)”…).
- Título arriba en negro/rojo; mensaje central (“NO FUNCIONA” / “SÍ FUNCIONA”) o lista numerada.

### Indicador de carrusel
- Óvalo gris oscuro, esquina superior derecha: “X/10”.
- Fuente pequeña, blanco.

---

## 5. Dimensiones y formato

- **Ratio:** 1:1 (1080×1080 px) para Instagram feed.
- **Safe area:** Mantener texto y elementos clave alejados de bordes y del indicador “X/10”.

---

## 6. Contenido adaptado para 000.AUTOMATIZALO

| Slide | Tema original (Guille) | Adaptación AUTOMATIZALO |
|-------|-------------------------|--------------------------|
| 1 | Guiones virales para Instagram | Automatización que hace crecer tu negocio |
| 2 | Nueva fórmula guiones virales | Nueva fórmula para automatizar tu negocio |
| 3 | Estructura gancho–valor–CTA no funciona | Estructura captación–valor–conversión sí funciona |
| 4 | Problema: retención | Problema: todo manual, sin escalar |
| 5 | Por qué: valor demasiado pronto | Por qué: el valor llega demasiado tarde |
| 6 | Esto es lo que tienes que HACER | Esto es lo que tienes que AUTOMATIZAR |
| 7 | Añadir “necesidad” a la estructura | Añadir necesidad a captación–valor–CTA |
| 8 | La necesidad aumenta retención y viraliza | La necesidad aumenta retención y escala tu negocio |
| 9 | Fórmula: Gancho, Necesidad, Valor, CTA (con tiempos) | Misma fórmula aplicada a flujos de automatización |
| 10 | CTA: Comenta “GUION” | CTA: Comenta “AUTOMATIZA” / @automatizalo |

---

## 7. Uso con Stitch

Para generar pantallas en Stitch con este estilo, incluir en el prompt:

- **Colores:** Fondo terracota `#C45C26` o crema `#F8F4F0`, acento rojo/naranja `#E74C3C`, texto negro, blanco sobre bloques de color.
- **Tipografía:** Títulos muy grandes en mayúsculas; una línea en cursiva/script; cuerpo sans-serif.
- **Layout:** Una idea principal por pantalla; opcional caja roja con lista en bandas blancas o flechas de flujo.
- **Formato:** Cuadrado 1080×1080, estilo póster para redes sociales.
