# Moderación de aportes — La Usina del PNA

La participación pública del sitio se guarda en Supabase y **ningún aporte se publica automáticamente**.

## Flujo de trabajo

1. Abrir el proyecto **La Usina del PNA** en Supabase.
2. Ir a **Table Editor → public → aportes**.
3. Filtrar por `status = pending`.
4. Revisar:
   - `author_name`: nombre o seudónimo.
   - `body`: texto enviado.
   - `article`: nota a la que pertenece.
   - `parent_id`: si es una respuesta a otro aporte.
   - `image_path`: si contiene una imagen.
5. Si hay imagen, verla en **Storage → participacion**. El bucket es privado.
6. Para publicar:
   - cambiar `status` a `approved`;
   - completar `approved_at` con la fecha/hora de aprobación.
7. Para no publicar:
   - cambiar `status` a `rejected`;
   - opcionalmente explicar el motivo en `moderator_note`.

La web solo muestra registros con `status = approved` y `is_deleted = false`.

## Criterios editoriales sugeridos

La moderación no busca eliminar desacuerdos. Debe intervenir cuando un aporte incluya agresiones personales, datos identificatorios o sensibles de terceros, imágenes sin consentimiento, spam o material claramente ajeno al propósito de La Usina.

## Imágenes

Formatos admitidos: JPG, PNG y WEBP.  
Tamaño máximo: 5 MB.  
Las imágenes permanecen privadas en Storage y la web genera enlaces temporales únicamente para aportes aprobados.

## Ocultar un aporte ya publicado

Cambiar `is_deleted` a `true`. Esto lo retira de la vista pública sin borrar el registro.
