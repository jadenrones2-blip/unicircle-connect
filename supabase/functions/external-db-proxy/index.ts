import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawExternalUrl = (Deno.env.get("EXTERNAL_SUPABASE_URL") ?? "").trim();
    const externalKey = (Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();

    const normalizeExternalUrl = (value: string): string | null => {
      let v = value.trim();
      if (!v) return null;

      // Users sometimes paste a full API path (e.g. .../auth/v1). supabase-js expects the base URL only.
      v = v.replace(/\/(auth|rest|functions)\/v1.*$/i, "");
      v = v.replace(/\/+$/, "");

      // Accept either:
      // - full base URL (https://...)
      // - host without protocol (...supabase.co)
      // - project ref (e.g. abcdefghijklmnop)
      if (!v.startsWith("http://") && !v.startsWith("https://")) {
        if (v.includes(".") || v.includes("supabase.co")) {
          v = `https://${v}`;
        } else {
          v = `https://${v}.supabase.co`;
        }
      }

      try {
        // Validate it parses as a URL.
        new URL(v);
        return v;
      } catch {
        return null;
      }
    };

    const externalUrl = normalizeExternalUrl(rawExternalUrl);

    console.log("External URL configured:", rawExternalUrl ? "Yes" : "No");
    console.log("External URL normalized:", externalUrl ?? "Invalid");
    console.log("External Key configured:", externalKey ? "Yes" : "No");

    if (!rawExternalUrl || !externalKey) {
      console.error("Missing external database credentials");
      return new Response(
        JSON.stringify({ error: "External database not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!externalUrl) {
      console.error("Invalid EXTERNAL_SUPABASE_URL (expected base URL, host, or project ref)");
      return new Response(
        JSON.stringify({ error: "Invalid external database configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client for external Supabase
    const externalSupabase = createClient(externalUrl, externalKey);

    const url = new URL(req.url);
    const table = url.searchParams.get("table");
    const action = url.searchParams.get("action") || "select";

    if (!table) {
      return new Response(
        JSON.stringify({ error: "Table parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Whitelist allowed tables for security
    const allowedTables = ["clubs", "events", "categories", "interests", "raw_club_pages"];
    if (!allowedTables.includes(table)) {
      console.error(`Attempted access to unauthorized table: ${table}`);
      return new Response(
        JSON.stringify({ error: "Table not allowed" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "GET" && action === "select") {
      // Handle SELECT queries
      const select = url.searchParams.get("select") || "*";
      const limit = parseInt(url.searchParams.get("limit") || "100");
      const offset = parseInt(url.searchParams.get("offset") || "0");

      console.log(`Fetching from ${table}: select=${select}, limit=${limit}, offset=${offset}`);

      let query = externalSupabase.from(table).select(select);

      // Apply filters if provided
      const filters = url.searchParams.get("filters");
      if (filters) {
        try {
          const filterObj = JSON.parse(filters);
          for (const [column, value] of Object.entries(filterObj)) {
            query = query.eq(column, value);
          }
        } catch (e) {
          console.error("Invalid filters JSON:", e);
        }
      }

      // Apply ordering if provided
      const orderBy = url.searchParams.get("orderBy");
      const orderAsc = url.searchParams.get("orderAsc") !== "false";
      if (orderBy) {
        query = query.order(orderBy, { ascending: orderAsc });
      }

      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        // Handle missing table gracefully - return empty array instead of error
        if (error.code === "PGRST205") {
          console.log(`Table ${table} not found - returning empty array`);
          return new Response(
            JSON.stringify({ data: [] }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        console.error(`Error fetching from ${table}:`, JSON.stringify(error));
        return new Response(
          JSON.stringify({ error: "Failed to fetch data", details: error.message, code: error.code }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Query result for ${table}:`, JSON.stringify(data?.slice(0, 2) || []));

      console.log(`Successfully fetched ${data?.length || 0} records from ${table}`);

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && action === "insert") {
      // Handle INSERT operations
      const body = await req.json();
      
      if (!body.record) {
        return new Response(
          JSON.stringify({ error: "Record data is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Inserting into ${table}:`, body.record);

      const { data, error } = await externalSupabase
        .from(table)
        .insert(body.record)
        .select();

      if (error) {
        console.error(`Error inserting into ${table}:`, error);
        return new Response(
          JSON.stringify({ error: "Failed to insert data" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Successfully inserted record into ${table}`);

      return new Response(
        JSON.stringify({ data }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && action === "update") {
      // Handle UPDATE operations
      const body = await req.json();
      
      if (!body.id || !body.record) {
        return new Response(
          JSON.stringify({ error: "ID and record data are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Updating ${table} id=${body.id}:`, body.record);

      const { data, error } = await externalSupabase
        .from(table)
        .update(body.record)
        .eq("id", body.id)
        .select();

      if (error) {
        console.error(`Error updating ${table}:`, error);
        return new Response(
          JSON.stringify({ error: "Failed to update data", details: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Successfully updated record in ${table}`);

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "DELETE" && action === "delete") {
      // Handle DELETE operations
      const filters = url.searchParams.get("filters");
      
      if (!filters) {
        return new Response(
          JSON.stringify({ error: "Filters are required for delete operations" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let query = externalSupabase.from(table).delete();
      
      try {
        const filterObj = JSON.parse(filters);
        for (const [column, value] of Object.entries(filterObj)) {
          query = query.eq(column, value as string | number | boolean);
        }
      } catch (e) {
        console.error("Invalid filters JSON:", e);
        return new Response(
          JSON.stringify({ error: "Invalid filters format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error, count } = await query;

      if (error) {
        console.error(`Error deleting from ${table}:`, error);
        return new Response(
          JSON.stringify({ error: "Failed to delete data", details: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Successfully deleted records from ${table}`);

      return new Response(
        JSON.stringify({ success: true, deleted: count }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && action === "delete-all-events") {
      // Special action to delete all events (for cleanup)
      if (table !== "events") {
        return new Response(
          JSON.stringify({ error: "This action is only allowed for events table" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Deleting all events from external database");

      const { error } = await externalSupabase
        .from("events")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all (workaround for no-filter delete)

      if (error) {
        console.error("Error deleting all events:", error);
        return new Response(
          JSON.stringify({ error: "Failed to delete events", details: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Successfully deleted all events");

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid request method or action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
