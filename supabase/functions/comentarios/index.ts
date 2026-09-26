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

  const u = new URL(req.url)
  const edition = (u.searchParams.get('edition') || '').trim()
  const article = (u.searchParams.get('article') || '').trim()
  if (!/^[0-9a-z-]{1,40}$/i.test(edition) || !/^[0-9a-z-]{1,100}$/i.test(article)) {
    return new Response(JSON.stringify({ items: [] }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  const secretKey = envKey('SUPABASE_SECRET_KEYS')
  if (!secretKey) return new Response(JSON.stringify({ error: 'Configuración incompleta.' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, secretKey)

  const q = await supabase.from('aportes').select('id,parent_id,author_name,body,image_path,created_at').eq('edition', edition).eq('article', article).eq('status','approved').eq('is_deleted', false).order('created_at', { ascending: true })
  if (q.error) return new Response(JSON.stringify({ error: 'No se pudo cargar la conversación.' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })

  const items = await Promise.all((q.data || []).map(async (x) => {
    let image_url = null
    if (x.image_path) {
      const signed = await supabase.storage.from('participacion').createSignedUrl(x.image_path, 3600)
      image_url = signed.data?.signedUrl || null
    }
    return { ...x, image_path: undefined, image_url }
  }))

  return new Response(JSON.stringify({ items }), { headers: { ...cors, 'Content-Type': 'application/json' } })
})