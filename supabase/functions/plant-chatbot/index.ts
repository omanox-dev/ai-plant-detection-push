import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message } = await req.json()
    
    // Simple plant chatbot logic
    let response = "I'm a plant chatbot. How can I help you with your plants today?"
    
    if (message.toLowerCase().includes('water')) {
      response = "Most plants need regular watering, but be careful not to overwater. Check the soil moisture before watering."
    } else if (message.toLowerCase().includes('sunlight')) {
      response = "Different plants have different sunlight needs. Some prefer bright indirect light, others can handle direct sun."
    } else if (message.toLowerCase().includes('fertilizer')) {
      response = "Fertilize your plants during their growing season (usually spring and summer) with a balanced fertilizer."
    }

    return new Response(
      JSON.stringify({ response }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
