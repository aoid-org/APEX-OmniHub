import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { callLLMJson, LLMMessage } from "../_shared/llm.ts";

interface GeneratedSkill {
  id: string;
  name: string;
  description: string;
  projected_monthly_revenue: string;
  confidence_score: number;
  tier: 'CORE' | 'GROWTH_ENGINE';
}

interface RequestBody {
  description: string;
  goal: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handlePreflight(req);
  }

  const origin = req.headers.get("origin");
  const corsHeaders = buildCorsHeaders(origin);

  try {
    // 1. Parse Input
    const { description, goal } = await req.json() as RequestBody;

    if (!description || !goal) {
      return new Response(JSON.stringify({ error: "Missing description or goal" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let skills: GeneratedSkill[] = [];

    // 2. Try LLM Generation
    const openAIKey = Deno.env.get('OPENAI_API_KEY');

    if (openAIKey) {
      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: `You are an expert business architect AI (OmniDev).
          Analyze the user's business description and goal.
          Generate a list of 3-5 operational skills/agents that would help them achieve their goal.

          Classify each skill as 'CORE' (essential infrastructure, low revenue impact) or 'GROWTH_ENGINE' (high leverage, revenue generating).

          Output JSON strictly matching this schema:
          {
            "skills": [
              {
                "id": "uuid",
                "name": "string (e.g. Austin_Tech_Executive_Hunter)",
                "description": "string (actionable description)",
                "projected_monthly_revenue": "string (e.g. $5,000+)",
                "confidence_score": number (0-100),
                "tier": "CORE" | "GROWTH_ENGINE"
              }
            ]
          }`
        },
        {
          role: 'user',
          content: `Business Description: ${description}\nPrimary Objective: ${goal}`
        }
      ];

      try {
        const result = await callLLMJson<{ skills: GeneratedSkill[] }>(messages);
        skills = result.data.skills;
      } catch (llmError) {
        console.error("LLM Generation Failed, falling back to heuristic generation", llmError);
        // Fallback logic below
      }
    }

    // 3. Fallback / Mock Generation (if LLM fails or no key)
    if (skills.length === 0) {
      // Basic heuristic generation based on keywords
      const isTech = description.toLowerCase().includes('tech') || description.toLowerCase().includes('software');

      skills = [
        {
          id: crypto.randomUUID(),
          name: "Operational_backbone_v1",
          description: "Automated scheduling and customer communication dispatch.",
          projected_monthly_revenue: "$0 (Efficiency Gain)",
          confidence_score: 95,
          tier: 'CORE'
        },
        {
          id: crypto.randomUUID(),
          name: isTech ? "Enterprise_Lead_Scraper" : "Local_Service_Arbitrage",
          description: isTech ? "Identifies high-value tech executives in target region." : "Aggregates local demand for immediate dispatch.",
          projected_monthly_revenue: "$4,500+",
          confidence_score: 88,
          tier: 'GROWTH_ENGINE'
        },
        {
          id: crypto.randomUUID(),
          name: "Dynamic_Pricing_Engine",
          description: "Adjusts service rates based on real-time demand and competitor analysis.",
          projected_monthly_revenue: "$1,200+",
          confidence_score: 82,
          tier: 'GROWTH_ENGINE'
        }
      ];
    }

    // 4. Return Response
    return new Response(JSON.stringify({ skills }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
