import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Define allowed columns per table for filtering
const ALLOWED_FILTER_COLUMNS: Record<string, string[]> = {
  clubs: ["id", "name", "category", "recruitingStatus", "status", "email"],
  events: ["id", "club_id", "date", "status", "category", "title"],
  categories: ["id", "name"],
  interests: ["id", "name", "category"],
  raw_club_pages: ["id", "club_id", "status"],
};

// Define allowed columns per table for ordering
const ALLOWED_ORDER_COLUMNS: Record<string, string[]> = {
  clubs: ["id", "name", "category", "created_at", "updated_at"],
  events: ["id", "date", "title", "created_at"],
  categories: ["id", "name"],
  interests: ["id", "name"],
  raw_club_pages: ["id", "created_at"],
};

// Maximum number of filters allowed per query
const MAX_FILTERS = 5;

// Maximum string length for filter values
const MAX_FILTER_VALUE_LENGTH = 500;

// ============ AUDIT LOGGING ============

interface AuditLogEntry {
  club_id: string;
  actor_user_id: string | null;
  action: string;
  details: Record<string, unknown>;
  ip_address: string;
}

async function logAuditEvent(
  supabase: any, 
  entry: AuditLogEntry
): Promise<void> {
  try {
    await supabase
      .from('admin_audit_log')
      .insert({
        club_id: entry.club_id,
        actor_user_id: entry.actor_user_id,
        action: entry.action,
        details: entry.details,
        ip_address: entry.ip_address,
      });
  } catch (err) {
    console.error('Failed to log audit event:', err);
    // Don't throw - audit logging should not break the main operation
  }
}

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('cf-connecting-ip') || 
         'unknown';
}

async function extractUserFromAuth(req: Request, supabaseUrl: string, anonKey: string): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  try {
    const userSupabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user } } = await userSupabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
}

// ============ VALIDATION HELPERS ============

// Validate filter value type and length
function isValidFilterValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  
  if (typeof value === "string") {
    return value.length <= MAX_FILTER_VALUE_LENGTH;
  }
  
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  
  if (typeof value === "boolean") {
    return true;
  }
  
  return false;
}

// Parse and validate filters with column whitelist
function parseAndValidateFilters(
  filtersParam: string | null,
  table: string
): { valid: boolean; filters: Record<string, unknown>; error?: string } {
  if (!filtersParam) {
    return { valid: true, filters: {} };
  }

  const allowedColumns = ALLOWED_FILTER_COLUMNS[table] || [];
  
  let filterObj: Record<string, unknown>;
  try {
    filterObj = JSON.parse(filtersParam);
  } catch {
    return { valid: false, filters: {}, error: "Invalid JSON format for filters" };
  }

  if (typeof filterObj !== "object" || filterObj === null || Array.isArray(filterObj)) {
    return { valid: false, filters: {}, error: "Filters must be a JSON object" };
  }

  const entries = Object.entries(filterObj);
  
  // Check filter count limit
  if (entries.length > MAX_FILTERS) {
    return { 
      valid: false, 
      filters: {}, 
      error: `Too many filters. Maximum allowed: ${MAX_FILTERS}` 
    };
  }

  const validatedFilters: Record<string, unknown> = {};
  
  for (const [column, value] of entries) {
    // Validate column name is in whitelist
    if (!allowedColumns.includes(column)) {
      console.warn(`Rejected invalid filter column "${column}" for table "${table}"`);
      return { 
        valid: false, 
        filters: {}, 
        error: `Invalid filter column: ${column}` 
      };
    }

    // Validate filter value
    if (!isValidFilterValue(value)) {
      return { 
        valid: false, 
        filters: {}, 
        error: `Invalid filter value for column: ${column}` 
      };
    }

    validatedFilters[column] = value;
  }

  return { valid: true, filters: validatedFilters };
}

// Validate order column
function isValidOrderColumn(orderBy: string | null, table: string): boolean {
  if (!orderBy) return true;
  const allowedColumns = ALLOWED_ORDER_COLUMNS[table] || [];
  return allowedColumns.includes(orderBy);
}

// ============ MAIN HANDLER ============

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ipAddress = getClientIP(req);

  try {
    const rawExternalUrl = (Deno.env.get("EXTERNAL_SUPABASE_URL") ?? "").trim();
    const externalKey = (Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
    
    // Internal Supabase for audit logging
    const internalUrl = Deno.env.get("SUPABASE_URL")!;
    const internalServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const internalAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const internalSupabase = createClient(internalUrl, internalServiceKey);

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
    
    // Extract user ID for audit logging
    const userId = await extractUserFromAuth(req, internalUrl, internalAnonKey);

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
      // Handle SELECT queries (no audit logging for reads)
      const select = url.searchParams.get("select") || "*";
      const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "100"), 1), 1000);
      const offset = Math.max(parseInt(url.searchParams.get("offset") || "0"), 0);

      console.log(`Fetching from ${table}: select=${select}, limit=${limit}, offset=${offset}`);

      let query = externalSupabase.from(table).select(select);

      // Apply validated filters
      const filtersParam = url.searchParams.get("filters");
      const { valid, filters, error: filterError } = parseAndValidateFilters(filtersParam, table);
      
      if (!valid) {
        console.error(`Filter validation failed for ${table}: ${filterError}`);
        return new Response(
          JSON.stringify({ error: filterError }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      for (const [column, value] of Object.entries(filters)) {
        query = query.eq(column, value as string | number | boolean);
      }

      // Apply validated ordering
      const orderBy = url.searchParams.get("orderBy");
      const orderAsc = url.searchParams.get("orderAsc") !== "false";
      
      if (orderBy) {
        if (!isValidOrderColumn(orderBy, table)) {
          console.warn(`Rejected invalid order column "${orderBy}" for table "${table}"`);
          return new Response(
            JSON.stringify({ error: `Invalid order column: ${orderBy}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
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

      // Audit log for insert
      const clubId = body.record.club_handle || body.record.club_id || body.record.id || 'unknown';
      await logAuditEvent(internalSupabase, {
        club_id: clubId,
        actor_user_id: userId,
        action: `${table}_insert`,
        details: {
          table,
          record_id: data?.[0]?.id,
          title: body.record.title || body.record.name,
          verified: body.record.verified,
        },
        ip_address: ipAddress,
      });

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

      // Audit log for update
      const clubId = body.record.club_handle || body.record.club_id || body.id;
      await logAuditEvent(internalSupabase, {
        club_id: clubId,
        actor_user_id: userId,
        action: `${table}_update`,
        details: {
          table,
          record_id: body.id,
          updated_fields: Object.keys(body.record),
        },
        ip_address: ipAddress,
      });

      console.log(`Successfully updated record in ${table}`);

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "DELETE" && action === "delete") {
      // Handle DELETE operations with validated filters
      const filtersParam = url.searchParams.get("filters");
      
      if (!filtersParam) {
        return new Response(
          JSON.stringify({ error: "Filters are required for delete operations" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { valid, filters, error: filterError } = parseAndValidateFilters(filtersParam, table);
      
      if (!valid) {
        console.error(`Filter validation failed for DELETE on ${table}: ${filterError}`);
        return new Response(
          JSON.stringify({ error: filterError }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (Object.keys(filters).length === 0) {
        return new Response(
          JSON.stringify({ error: "At least one filter is required for delete operations" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let query = externalSupabase.from(table).delete();
      
      for (const [column, value] of Object.entries(filters)) {
        query = query.eq(column, value as string | number | boolean);
      }

      const { error, count } = await query;

      if (error) {
        console.error(`Error deleting from ${table}:`, error);
        return new Response(
          JSON.stringify({ error: "Failed to delete data", details: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Audit log for delete
      const clubId = (filters.club_handle || filters.club_id || filters.id || 'unknown') as string;
      await logAuditEvent(internalSupabase, {
        club_id: clubId,
        actor_user_id: userId,
        action: `${table}_delete`,
        details: {
          table,
          filters,
          deleted_count: count,
        },
        ip_address: ipAddress,
      });

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

      // Audit log for bulk delete
      await logAuditEvent(internalSupabase, {
        club_id: 'system',
        actor_user_id: userId,
        action: 'events_bulk_delete',
        details: {
          action: 'delete-all-events',
          reason: 'Manual cleanup',
        },
        ip_address: ipAddress,
      });

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
