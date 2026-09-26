import { createClient } from 'npm:@supabase/supabase-js@2.95.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function envKey(name: string) {
  try {
    const all = JSON.parse(Deno.env.get(name) || '{}')
    return all.default || ''
  } catch {
    return ''
  }
}

function authorized(req: Request) {
  const expected = envKey('SUPABASE_PUBLISHABLE_KEYS')
  return Boolean(expected) && req.headers.get('apikey') === expected
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (!authorized(req)) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } })

  try {
    const form = await req.formData()
    if (String(form.get('website') || '').trim()) {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const edition = String(form.get('edition') || '').trim()
    const article = String(form.get('article') || '').trim()
    const author_name = String(form.get('author_name') || '').trim()
    const body = String(form.get('body') || '').trim()
    const parent_id = String(form.get('parent_id') || '').trim() || null
    const image = form.get('image')

    if (!/^[0-9a-z-]{1,40}$/i.test(edition) || !/^[0-9a-z-]{1,100}$/i.test(article)) {
      return new Response(JSON.stringify({ error: 'Referencia de publicación inválida.' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    if (author_name.length < 2 || author_name.length > 80 || body.length < 2 || body.length > 3000) {
      return new Response(JSON.stringify({ error: 'Revisá el nombre y el texto del aporte.' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const secretKey = envKey('SUPABASE_SECRET_KEYS')
    if (!secretKey) throw new Error('Secret key unavailable')
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, secretKey)
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
  } catch {
    return new Response(JSON.stringify({ error: 'No se pudo guardar el aporte.' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})