import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } })

  try {
    const form = await req.formData()
    if (String(form.get('website') || '').trim()) return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } })

    const edition = String(form.get('edition') || '').trim()
    const article = String(form.get('article') || '').trim()
    const author_name = String(form.get('author_name') || '').trim()
    const body = String(form.get('body') || '').trim()
    const parent_id = String(form.get('parent_id') || '').trim() || null
    const image = form.get('image')

    if (!edition || !article || author_name.length < 2 || author_name.length > 80 || body.length < 2 || body.length > 3000) {
      return new Response(JSON.stringify({ error: 'Revisá el nombre y el texto del aporte.' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    let image_path: string | null = null

    if (image instanceof File && image.size > 0) {
      if (image.size > 5 * 1024 * 1024 || !['image/jpeg','image/png','image/webp'].includes(image.type)) {
        return new Response(JSON.stringify({ error: 'La imagen debe ser JPG, PNG o WEBP y pesar menos de 5 MB.' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
      }
      const ext = image.type === 'image/png' ? 'png' : image.type === 'image/webp' ? 'webp' : 'jpg'
      image_path = edition + '/' + article + '/' + crypto.randomUUID() + '.' + ext
      const upload = await supabase.storage.from('participacion').upload(image_path, image, { contentType: image.type, upsert: false })
      if (upload.error) throw upload.error
    }

    if (parent_id) {
      const parent = await supabase.from('aportes').select('id,edition,article,status').eq('id', parent_id).maybeSingle()
      if (parent.error || !parent.data || parent.data.edition !== edition || parent.data.article !== article || parent.data.status !== 'approved') {
        return new Response(JSON.stringify({ error: 'La respuesta no pudo vincularse con ese aporte.' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
      }
    }

    const ins = await supabase.from('aportes').insert({ edition, article, parent_id, author_name, body, image_path, status: 'pending' }).select('id').single()
    if (ins.error) throw ins.error

    return new Response(JSON.stringify({ ok: true, id: ins.data.id }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'No se pudo guardar el aporte.' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
