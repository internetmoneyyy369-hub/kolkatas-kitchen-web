import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { latitude, longitude, shopType } = await req.json()
    
    // 1. Fetch geo-filtered restaurants using PostGIS via the Custom RPC we deployed
    const { data: restaurants, error: rpcError } = await supabaseClient.rpc('nearby_restaurants', {
      p_latitude: latitude,
      p_longitude: longitude,
      p_radius_km: 150, // fairly large radius for testing/demo
      p_shop_type: shopType || null
    })

    if (rpcError) throw rpcError

    // 2. Fetch active offers & groupings (sections) to build the HomeScreen Payload
    const [offersRes, sectionsRes] = await Promise.all([
      supabaseClient.from('offers').select('*').eq('is_active', true),
      supabaseClient.from('sections').select('*').eq('enabled', true)
    ])

    // Build the payload shaped like what the former GraphQL endpoint returned
    const graphqlShapedPayload = {
      offers: offersRes.data || [],
      sections: sectionsRes.data || [],
      restaurants: restaurants || []
    }

    return new Response(JSON.stringify(graphqlShapedPayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
