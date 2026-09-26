# Moderación de aportes — La Usina del PNA

La participación pública del sitio se modera desde una pantalla privada. El equipo editorial no necesita entrar al Table Editor de Supabase.

## Acceso

Abrir `/moderacion.html` en el sitio de La Usina e ingresar la clave editorial.

La clave se valida en una Edge Function y no está incluida en el código público de GitHub. El navegador la conserva solo durante la sesión abierta.

## Pantalla

El panel tiene tres secciones:

- **Pendientes:** nuevos aportes que todavía no son visibles en la web.
- **Publicados:** comentarios aprobados que ya aparecen debajo de los artículos.
- **Rechazados:** aportes que el equipo decidió no publicar.

Cada tarjeta muestra nombre o seudónimo, artículo, fecha, texto completo y, cuando corresponde, la imagen adjunta.

## Acciones

- **Aprobar:** publica el aporte.
- **Rechazar:** no lo publica y permite guardar un motivo interno opcional.
- **Ocultar:** retira de la vista pública un comentario ya aprobado sin borrarlo.
- **Volver a mostrar:** restaura un comentario oculto.

La moderación no busca eliminar desacuerdos. Se recomienda intervenir ante agresiones personales, datos identificatorios o sensibles de terceros, imágenes sin consentimiento, spam o material claramente ajeno al propósito de La Usina.

## Imágenes

Formatos admitidos: JPG, PNG y WEBP. Tamaño máximo: 5 MB.
Las imágenes permanecen privadas en Storage y el panel genera enlaces temporales para revisarlas.
