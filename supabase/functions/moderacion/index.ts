import { createClient } from 'npm:@supabase/supabase-js@2.95.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-moderation-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function envKey(name: string) {
  try {
    const all = JSON.parse(Deno.env.get(name) || '{}')
    return all.default || ''
  } catch {
    return ''
  }
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const publishable = envKey('SUPABASE_PUBLISHABLE_KEYS')
  if (!publishable || req.headers.get('apikey') !== publishable) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  const secretKey = envKey('SUPABASE_SECRET_KEYS')
  if (!secretKey) return new Response(JSON.stringify({ error: 'Configuración incompleta' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, secretKey)

  const moderationKey = req.headers.get('x-moderation-key') || ''
  if (!moderationKey) return new Response(JSON.stringify({ error: 'Clave editorial requerida' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } })

  const { data: access, error: accessError } = await supabase
    .from('moderation_access')
    .select('secret_hash')
    .eq('id', true)
    .maybeSingle()

  if (accessError || !access) return new Response(JSON.stringify({ error: 'No se pudo validar el acceso' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })

  const suppliedHash = await sha256(moderationKey)
  if (!safeEqual(suppliedHash, access.secret_hash)) {
    return new Response(JSON.stringify({ error: 'Clave editorial incorrecta' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  if (req.method === 'GET') {
    const u = new URL(req.url)
    const status = u.searchParams.get('status') || 'pending'
    const allowed = ['pending','approved','rejected']
    if (!allowed.includes(status)) return new Response(JSON.stringify({ error: 'Estado inválido' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })

    const { data, error } = await supabase
      .from('aportes')
      .select('id,edition,article,parent_id,author_name,body,image_path,status,created_at,approved_at,moderator_note,is_deleted')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) return new Response(JSON.stringify({ error: 'No se pudieron cargar los aportes' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })

    const items = await Promise.all((data || []).map(async (x) => {
      let image_url = null
      if (x.image_path) {
        const signed = await supabase.storage.from('participacion').createSignedUrl(x.image_path, 1800)
        image_url = signed.data?.signedUrl || null
      }
      return { ...x, image_path: undefined, image_url }
    }))

    return new Response(JSON.stringify({ items }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  if (req.method === 'POST') {
    const data = await req.json().catch(() => ({}))
    const action = String(data.action || '')
    const id = String(data.id || '')
    const note = String(data.note || '').slice(0, 500)

    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return new Response(JSON.stringify({ error: 'Aporte inválido' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    let update: Record<string, unknown>
    if (action === 'approve') {
      update = { status: 'approved', approved_at: new Date().toISOString(), moderator_note: note || null, is_deleted: false }
    } else if (action === 'reject') {
      update = { status: 'rejected', approved_at: null, moderator_note: note || null }
    } else if (action === 'hide') {
      update = { is_deleted: true, moderator_note: note || null }
    } else if (action === 'restore') {
      update = { is_deleted: false }
    } else {
      return new Response(JSON.stringify({ error: 'Acción inválida' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const { data: updated, error } = await supabase.from('aportes').update(update).eq('id', id).select('id,status,is_deleted,approved_at').maybeSingle()
    if (error || !updated) return new Response(JSON.stringify({ error: 'No se pudo actualizar el aporte' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })

    return new Response(JSON.stringify({ ok: true, item: updated }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } })
})