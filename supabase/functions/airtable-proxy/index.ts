import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const AIRTABLE_API_KEY = Deno.env.get("AIRTABLE_API_KEY");

// Different bases for different tables
const AIRTABLE_BASES = {
  clubs: "appWLPeogJR4JIGQj",
  events: "appWLPeogJR4JIGQj",
  interests: "appLDj0Vw8TIw1WC2",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute

function isRateLimited(clientIp: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(clientIp);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  
  record.count++;
  return false;
}

// Input validation for interest submissions
function validateInterestFields(fields: unknown): { valid: boolean; error?: string; sanitized?: Record<string, string> } {
  if (!fields || typeof fields !== 'object') {
    return { valid: false, error: 'Fields must be an object' };
  }
  
  const f = fields as Record<string, unknown>;
  
  // Validate Name
  if (typeof f.Name !== 'string' || f.Name.trim().length === 0) {
    return { valid: false, error: 'Name is required and must be a non-empty string' };
  }
  if (f.Name.length > 100) {
    return { valid: false, error: 'Name must be 100 characters or less' };
  }
  
  // Validate Email
  if (typeof f.Email !== 'string' || f.Email.trim().length === 0) {
    return { valid: false, error: 'Email is required and must be a non-empty string' };
  }
  if (f.Email.length > 254) {
    return { valid: false, error: 'Email must be 254 characters or less' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(f.Email)) {
    return { valid: false, error: 'Email must be a valid email address' };
  }
  
  // Validate Notes (optional but has length limit)
  if (f.Notes !== undefined && f.Notes !== null) {
    if (typeof f.Notes !== 'string') {
      return { valid: false, error: 'Notes must be a string' };
    }
    if (f.Notes.length > 1000) {
      return { valid: false, error: 'Notes must be 1000 characters or less' };
    }
  }
  
  // Return only allowed fields (sanitized)
  return {
    valid: true,
    sanitized: {
      Name: f.Name.trim(),
      Email: f.Email.trim().toLowerCase(),
      ...(f.Notes ? { Notes: f.Notes.trim() } : {}),
    },
  };
}

function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Airtable proxy request received");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting check
  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp)) {
    console.warn(`Rate limit exceeded for IP: ${clientIp}`);
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!AIRTABLE_API_KEY) {
    console.error("AIRTABLE_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "Airtable API key not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const url = new URL(req.url);
    const table = url.searchParams.get("table");
    const action = url.searchParams.get("action") || "list";

    if (!table) {
      return new Response(
        JSON.stringify({ error: "Table parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map friendly table names to Airtable table IDs
    const tableMap: Record<string, { baseId: string; tableId: string }> = {
      clubs: { baseId: AIRTABLE_BASES.clubs, tableId: "tblWFqLCSDZev4p25" },
      events: { baseId: AIRTABLE_BASES.events, tableId: "Events" },
      interests: { baseId: AIRTABLE_BASES.interests, tableId: "tblVLS0M1JCEAsqmQ" },
      "interest-submissions": { baseId: AIRTABLE_BASES.interests, tableId: "tblVLS0M1JCEAsqmQ" },
    };

    const tableKey = table.toLowerCase();
    const tableConfig = tableMap[tableKey];
    
    if (!tableConfig) {
      return new Response(
        JSON.stringify({ error: `Unknown table: ${table}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const airtableUrl = `https://api.airtable.com/v0/${tableConfig.baseId}/${encodeURIComponent(tableConfig.tableId)}`;

    if (req.method === "GET" && action === "list") {
      // Fetch all records from the table
      console.log(`Fetching records from table: ${tableConfig.tableId}`);
      
      let allRecords: AirtableRecord[] = [];
      let offset: string | undefined;

      do {
        const fetchUrl = offset 
          ? `${airtableUrl}?offset=${offset}` 
          : airtableUrl;

        const response = await fetch(fetchUrl, {
          headers: {
            Authorization: `Bearer ${AIRTABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Airtable API error: ${response.status} - ${errorText}`);
          return new Response(
            JSON.stringify({
              error: `Airtable API error: ${response.status}`,
              details: errorText,
            }),
            { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const data: AirtableResponse = await response.json();
        allRecords = [...allRecords, ...data.records];
        offset = data.offset;
      } while (offset);

      console.log(`Successfully fetched ${allRecords.length} records from ${tableConfig.tableId}`);

      return new Response(
        JSON.stringify({ records: allRecords }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && action === "create") {
      // Only allow creates on the interests table
      if (tableKey !== "interests" && tableKey !== "interest-submissions") {
        return new Response(
          JSON.stringify({ error: "Create action is only allowed for interest submissions" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body = await req.json();
      console.log(`Creating record in table: ${tableConfig.tableId}`);

      // Validate and sanitize input
      const validation = validateInterestFields(body.fields);
      if (!validation.valid) {
        console.warn(`Validation failed: ${validation.error}`);
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const response = await fetch(airtableUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields: validation.sanitized }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Airtable API error: ${response.status} - ${errorText}`);
        return new Response(
          JSON.stringify({
            error: `Airtable API error: ${response.status}`,
            details: errorText,
          }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      console.log(`Successfully created record in ${tableConfig.tableId}`);

      return new Response(
        JSON.stringify(data),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action or method" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in airtable-proxy:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
