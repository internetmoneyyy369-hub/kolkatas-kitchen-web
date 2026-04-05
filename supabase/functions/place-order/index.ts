import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // We need service_role logic because calculating exact payment/subtotals
    // and validating user requests requires admin privileges in standard flows.
    // But since RLS allows logged in users to insert their own orders, anon key + token is enough.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const body = await req.json()
    const { 
      restaurant, 
      orderInput, 
      paymentMethod, 
      couponCode, 
      tipping, 
      taxationAmount, 
      address, 
      orderDate, 
      isPickedUp, 
      deliveryCharges, 
      instructions 
    } = body

    // Calculate total order amount based on frontend input 
    // (Note: in high-security production apps, you'd recalculate this from the DB directly to prevent spoofing)
    let totalItemsPrice = 0
    for (const item of orderInput) {
      // In a real robust system, fetch Item using supabaseClient.from('food_variations') and verify price
      totalItemsPrice += (item.unit_price || 0) * item.quantity
    }
    
    let totalOrderAmount = totalItemsPrice + (taxationAmount || 0) + (deliveryCharges || 0) + (tipping || 0)

    // Coupon logic calculation here if couponCode is provided...
    // We'll skip complex DB coupon validation in this boilerplate

    // 1. Create the Order
    const { data: newOrder, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        user_id: user.id,
        restaurant_id: restaurant,
        delivery_address: address, // Saved as JSONB 
        payment_method: paymentMethod,
        order_amount: totalOrderAmount,
        tipping: tipping || 0,
        taxation_amount: taxationAmount || 0,
        delivery_charges: deliveryCharges || 0,
        instructions: instructions || '',
        is_picked_up: isPickedUp || false,
        order_date: orderDate || new Date().toISOString()
      })
      .select()
      .single()

    if (orderError) throw orderError

    // 2. Insert Order Items
    if (orderInput && orderInput.length > 0) {
      const itemsToInsert = orderInput.map((item: any) => ({
        order_id: newOrder.id,
        food_id: item.food_id,
        variation_id: item.variation_id,
        title: item.title,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price || 0,
        special_instructions: item.specialInstructions || '',
        addons: item.addons || []
      }))

      const { error: itemsError } = await supabaseClient
        .from('order_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError
    }

    // 3. (Optional) Trigger a push notification to restaurant/push systems here

    return new Response(JSON.stringify(newOrder), {
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
