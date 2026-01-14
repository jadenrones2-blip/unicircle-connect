import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const AIRTABLE_API_KEY = Deno.env.get("AIRTABLE_API_KEY");
const AIRTABLE_BASE_ID = "appWLPeogJR4JIGQj";

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

const handler = async (req: Request): Promise<Response> => {
  console.log("Airtable proxy request received");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    // Map friendly table names to Airtable table names (table IDs are the most reliable)
    const tableMap: Record<string, string> = {
      // Airtable table ID from URL: https://airtable.com/appWLPeogJR4JIGQj/tblWFqLCSDZev4p25/...
      clubs: "tblWFqLCSDZev4p25",
      events: "Events",
      interests: "Interest Submissions",
      "interest-submissions": "Interest Submissions",
    };

    const airtableTable = tableMap[table.toLowerCase()] || table;
    const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(airtableTable)}`;

    if (req.method === "GET" && action === "list") {
      // Fetch all records from the table
      console.log(`Fetching records from table: ${airtableTable}`);
      
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

      console.log(`Successfully fetched ${allRecords.length} records from ${airtableTable}`);

      return new Response(
        JSON.stringify({ records: allRecords }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && action === "create") {
      // Create a new record
      const body = await req.json();
      console.log(`Creating record in table: ${airtableTable}`);

      const response = await fetch(airtableUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields: body.fields }),
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
      console.log(`Successfully created record in ${airtableTable}`);

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
