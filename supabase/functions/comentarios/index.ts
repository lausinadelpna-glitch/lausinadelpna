import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const u = new URL(req.url)
  const edition = (u.searchParams.get('edition') || '').trim()
  const article = (u.searchParams.get('article') || '').trim()
  if (!edition || !article) return new Response(JSON.stringify({ items: [] }), { headers: { ...cors, 'Content-Type': 'application/json' } })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
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
