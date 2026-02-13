import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Define allowed columns per table for filtering
const ALLOWED_FILTER_COLUMNS: Record<string, string[]> = {
  clubs: ["id", "name", "handle", "category", "recruitingStatus", "recruitment_cycle", "status", "email", "eventbrite_organizer_url", "eventbrite_sync_status"],
  events: ["id", "club_id", "club_handle", "date", "status", "category", "title", "verified", "source", "external_source", "external_id"],
  categories: ["id", "name"],
  interests: ["id", "name", "category"],
  raw_club_pages: ["id", "club_id", "status"],
};

// Define allowed columns per table for ordering
const ALLOWED_ORDER_COLUMNS: Record<string, string[]> = {
  clubs: ["id", "name", "category", "created_at", "updated_at"],
  events: ["id", "date", "title", "created_at", "start_time"],
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
  supabase: ReturnType<typeof createClient>, 
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
  }
}

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('cf-connecting-ip') || 
         'unknown';
}

interface AuthResult {
  userId: string | null;
  userEmail: string | null;
}

async function extractUserFromAuth(req: Request, supabaseUrl: string, anonKey: string): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return { userId: null, userEmail: null };
  
  try {
    const userSupabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user } } = await userSupabase.auth.getUser();
    return { userId: user?.id || null, userEmail: user?.email || null };
  } catch {
    return { userId: null, userEmail: null };
  }
}

// ============ AUTHORIZATION HELPERS ============

interface ClubOwnerInfo {
  club_id: string;
  verification_state: string | null;
  restrictions: {
    can_publish_events: boolean;
    can_mass_message: boolean;
    can_add_links: boolean;
  } | null;
}

async function getClubOwnership(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  clubId: string
): Promise<ClubOwnerInfo | null> {
  try {
    const { data, error } = await supabase
      .from('club_owners')
      .select('club_id, verification_state, restrictions')
      .eq('user_id', userId)
      .eq('club_id', clubId)
      .maybeSingle();
    
    if (error || !data) return null;
    return data as ClubOwnerInfo;
  } catch {
    return null;
  }
}

function canPublishEvents(ownership: ClubOwnerInfo): boolean {
  // Verified owners can publish
  if (ownership.verification_state === 'verified') return true;
  
  // Suspended owners cannot
  if (ownership.verification_state === 'suspended') return false;
  
  // Provisional owners check restrictions
  if (ownership.verification_state === 'provisional') {
    return ownership.restrictions?.can_publish_events === true;
  }
  
  // Unverified cannot publish
  return false;
}

// ============ VALIDATION HELPERS ============

function isValidFilterValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  
  if (typeof value === "string") return value.length <= MAX_FILTER_VALUE_LENGTH;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  
  return false;
}

function parseAndValidateFilters(
  filtersParam: string | null,
  table: string
): { valid: boolean; filters: Record<string, unknown>; error?: string } {
  if (!filtersParam) return { valid: true, filters: {} };

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
  
  if (entries.length > MAX_FILTERS) {
    return { valid: false, filters: {}, error: `Too many filters. Maximum allowed: ${MAX_FILTERS}` };
  }

  const validatedFilters: Record<string, unknown> = {};
  
  for (const [column, value] of entries) {
    if (!allowedColumns.includes(column)) {
      console.warn(`Rejected invalid filter column "${column}" for table "${table}"`);
      return { valid: false, filters: {}, error: `Invalid filter column: ${column}` };
    }

    if (!isValidFilterValue(value)) {
      return { valid: false, filters: {}, error: `Invalid filter value for column: ${column}` };
    }

    validatedFilters[column] = value;
  }

  return { valid: true, filters: validatedFilters };
}

function isValidOrderColumn(orderBy: string | null, table: string): boolean {
  if (!orderBy) return true;
  const allowedColumns = ALLOWED_ORDER_COLUMNS[table] || [];
  return allowedColumns.includes(orderBy);
}

// ============ MAIN HANDLER ============

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ipAddress = getClientIP(req);

  try {
    const rawExternalUrl = (Deno.env.get("EXTERNAL_SUPABASE_URL") ?? "").trim();
    const externalKey = (Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
    
    const internalUrl = Deno.env.get("SUPABASE_URL")!;
    const internalServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const internalAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const internalSupabase = createClient(internalUrl, internalServiceKey);

    const normalizeExternalUrl = (value: string): string | null => {
      let v = value.trim();
      if (!v) return null;
      v = v.replace(/\/(auth|rest|functions)\/v1.*$/i, "");
      v = v.replace(/\/+$/, "");

      if (!v.startsWith("http://") && !v.startsWith("https://")) {
        if (v.includes(".") || v.includes("supabase.co")) {
          v = `https://${v}`;
        } else {
          v = `https://${v}.supabase.co`;
        }
      }

      try {
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
      console.error("Invalid EXTERNAL_SUPABASE_URL");
      return new Response(
        JSON.stringify({ error: "Invalid external database configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const externalSupabase = createClient(externalUrl, externalKey);
    
    const { userId, userEmail } = await extractUserFromAuth(req, internalUrl, internalAnonKey);

    const url = new URL(req.url);
    
    // Support table/action from URL params (GET requests, frontend fetch) 
    // or from request body (supabase.functions.invoke calls)
    let table = url.searchParams.get("table");
    let action = url.searchParams.get("action") || "select";
    
    // For POST requests, peek at body to extract table/action if not in URL
    let _parsedBody: Record<string, unknown> | null = null;
    if (req.method === "POST" && !table) {
      try {
        _parsedBody = await req.json();
        if (_parsedBody?.table) table = String(_parsedBody.table);
        if (_parsedBody?.action) action = String(_parsedBody.action);
      } catch {
        // Body parsing failed, will fall through to table validation
      }
    }

    if (!table) {
      return new Response(
        JSON.stringify({ error: "Table parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allowedTables = ["clubs", "events", "categories", "interests", "raw_club_pages"];
    if (!allowedTables.includes(table)) {
      console.error(`Attempted access to unauthorized table: ${table}`);
      return new Response(
        JSON.stringify({ error: "Table not allowed" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ SELECT (GET) ============
    if (req.method === "GET" && action === "select") {
      const select = url.searchParams.get("select") || "*";
      const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "100"), 1), 1000);
      const offset = Math.max(parseInt(url.searchParams.get("offset") || "0"), 0);

      console.log(`Fetching from ${table}: select=${select}, limit=${limit}, offset=${offset}`);

      let query = externalSupabase.from(table).select(select);

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
        if (error.code === "PGRST205") {
          console.log(`Table ${table} not found - returning empty array`);
          return new Response(
            JSON.stringify({ data: [] }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        console.error(`Error fetching from ${table}:`, JSON.stringify(error));
        return new Response(
          JSON.stringify({ error: "Failed to fetch data" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Successfully fetched ${data?.length || 0} records from ${table}`);

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ INSERT (POST) ============
    if (req.method === "POST" && action === "insert") {
      const body = _parsedBody || await req.json();
      
      if (!body.record) {
        return new Response(
          JSON.stringify({ error: "Record data is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // SERVER-SIDE AUTHORIZATION for events table
      if (table === "events") {
        // Require authentication
        if (!userId) {
          console.warn("Unauthenticated attempt to insert event");
          await logAuditEvent(internalSupabase, {
            club_id: body.record.club_handle || 'unknown',
            actor_user_id: null,
            action: 'events_insert_unauthorized',
            details: { reason: 'unauthenticated', ip_address: ipAddress },
            ip_address: ipAddress,
          });
          return new Response(
            JSON.stringify({ error: "Authentication required" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const clubId = body.record.club_handle || body.record.club_id;
        if (!clubId) {
          return new Response(
            JSON.stringify({ error: "Club identifier is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verify club ownership
        const ownership = await getClubOwnership(internalSupabase, userId, clubId);
        if (!ownership) {
          console.warn(`User ${userId} attempted to insert event for club ${clubId} without ownership`);
          await logAuditEvent(internalSupabase, {
            club_id: clubId,
            actor_user_id: userId,
            action: 'events_insert_forbidden',
            details: { reason: 'not_owner', user_email: userEmail },
            ip_address: ipAddress,
          });
          return new Response(
            JSON.stringify({ error: "You must own this club to create events" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Enforce provisional restrictions - override verified/posted_at
        const allowPublish = canPublishEvents(ownership);
        if (!allowPublish) {
          // Force unverified state for provisional/unverified owners
          body.record.verified = false;
          body.record.posted_at = null;
          console.log(`Provisional owner ${userId}: forcing verified=false for club ${clubId}`);
        }
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

    // ============ UPDATE (POST) ============
    // ============ ADMIN REVIEW (POST) ============
    // Bypasses club-ownership checks but requires admin role
    if (req.method === "POST" && action === "admin-review") {
      const body = _parsedBody || await req.json();
      
      if (!body.id || !body.record) {
        return new Response(
          JSON.stringify({ error: "ID and record data are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (table !== "events") {
        return new Response(
          JSON.stringify({ error: "Admin review is only allowed for events" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Require authentication
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Authentication required" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify admin role
      const { data: hasAdmin } = await internalSupabase.rpc('has_role', {
        _user_id: userId,
        _role: 'admin',
      });

      if (!hasAdmin) {
        console.warn(`Non-admin user ${userId} attempted admin-review`);
        return new Response(
          JSON.stringify({ error: "Admin access required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Only allow review-safe fields
      const allowedFields = ['verified', 'reviewed_at', 'corrected_title', 'corrected_start_time', 'corrected_end_time', 'corrected_location'];
      const safeRecord: Record<string, unknown> = {};
      for (const key of allowedFields) {
        if (key in body.record) {
          safeRecord[key] = body.record[key];
        }
      }

      console.log(`Admin review event id=${body.id}:`, safeRecord);

      const { data, error } = await externalSupabase
        .from("events")
        .update(safeRecord)
        .eq("id", body.id)
        .select();

      if (error) {
        console.error("Error in admin review:", error);
        return new Response(
          JSON.stringify({ error: "Failed to update event" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await logAuditEvent(internalSupabase, {
        club_id: 'admin-review',
        actor_user_id: userId,
        action: 'events_admin_review',
        details: { event_id: body.id, updated_fields: Object.keys(safeRecord) },
        ip_address: ipAddress,
      });

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ ADMIN DELETE (POST) ============
    // Allows admins to reject/delete events without club ownership
    if (req.method === "POST" && action === "admin-delete") {
      const body = _parsedBody || await req.json();

      if (!body.id) {
        return new Response(
          JSON.stringify({ error: "Event ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (table !== "events") {
        return new Response(
          JSON.stringify({ error: "Admin delete is only allowed for events" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Authentication required" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: hasAdmin } = await internalSupabase.rpc('has_role', {
        _user_id: userId,
        _role: 'admin',
      });

      if (!hasAdmin) {
        return new Response(
          JSON.stringify({ error: "Admin access required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await externalSupabase
        .from("events")
        .delete()
        .eq("id", body.id);

      if (error) {
        console.error("Error in admin delete:", error);
        return new Response(
          JSON.stringify({ error: "Failed to delete event" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await logAuditEvent(internalSupabase, {
        club_id: 'admin-review',
        actor_user_id: userId,
        action: 'events_admin_delete',
        details: { event_id: body.id, reason: body.reason || 'rejected' },
        ip_address: ipAddress,
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ ADMIN BULK DELETE (POST) ============
    if (req.method === "POST" && action === "admin-bulk-delete") {
      const body = _parsedBody || await req.json();

      if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
        return new Response(
          JSON.stringify({ error: "Array of event IDs is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (body.ids.length > 200) {
        return new Response(
          JSON.stringify({ error: "Maximum 200 events can be deleted at once" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (table !== "events") {
        return new Response(
          JSON.stringify({ error: "Admin bulk delete is only allowed for events" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Authentication required" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: hasAdmin } = await internalSupabase.rpc('has_role', {
        _user_id: userId,
        _role: 'admin',
      });

      if (!hasAdmin) {
        return new Response(
          JSON.stringify({ error: "Admin access required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await externalSupabase
        .from("events")
        .delete()
        .in("id", body.ids);

      if (error) {
        console.error("Error in admin bulk delete:", error);
        return new Response(
          JSON.stringify({ error: "Failed to delete events" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await logAuditEvent(internalSupabase, {
        club_id: 'admin-review',
        actor_user_id: userId,
        action: 'events_admin_bulk_delete',
        details: { event_ids: body.ids, count: body.ids.length, reason: body.reason || 'bulk_rejected' },
        ip_address: ipAddress,
      });

      return new Response(
        JSON.stringify({ success: true, deleted: body.ids.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ UPDATE (POST) ============
    if (req.method === "POST" && action === "update") {
      const body = _parsedBody || await req.json();
      
      if (!body.id || !body.record) {
        return new Response(
          JSON.stringify({ error: "ID and record data are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // SERVER-SIDE AUTHORIZATION for events table
      if (table === "events") {
        if (!userId) {
          console.warn("Unauthenticated attempt to update event");
          return new Response(
            JSON.stringify({ error: "Authentication required" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Fetch the existing event to get club_handle
        const { data: existingEvent } = await externalSupabase
          .from("events")
          .select("club_handle, club_id")
          .eq("id", body.id)
          .maybeSingle();

        const clubId = existingEvent?.club_handle || existingEvent?.club_id || body.record.club_handle;
        if (!clubId) {
          return new Response(
            JSON.stringify({ error: "Cannot determine club for this event" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const ownership = await getClubOwnership(internalSupabase, userId, clubId);
        if (!ownership) {
          console.warn(`User ${userId} attempted to update event for club ${clubId} without ownership`);
          await logAuditEvent(internalSupabase, {
            club_id: clubId,
            actor_user_id: userId,
            action: 'events_update_forbidden',
            details: { reason: 'not_owner', event_id: body.id },
            ip_address: ipAddress,
          });
          return new Response(
            JSON.stringify({ error: "You must own this club to update events" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Enforce provisional restrictions
        const allowPublish = canPublishEvents(ownership);
        if (!allowPublish) {
          // Prevent setting verified=true or posted_at
          if (body.record.verified === true) {
            body.record.verified = false;
          }
          if (body.record.posted_at) {
            delete body.record.posted_at;
          }
          console.log(`Provisional owner ${userId}: stripping verified/posted_at for event update`);
        }
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
          JSON.stringify({ error: "Failed to update data" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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

    // ============ DELETE ============
    if (req.method === "DELETE" && action === "delete") {
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

      // SERVER-SIDE AUTHORIZATION for events table
      if (table === "events") {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: "Authentication required" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const clubId = (filters.club_handle || filters.club_id) as string | undefined;
        if (clubId) {
          const ownership = await getClubOwnership(internalSupabase, userId, clubId);
          if (!ownership) {
            console.warn(`User ${userId} attempted to delete event for club ${clubId} without ownership`);
            return new Response(
              JSON.stringify({ error: "You must own this club to delete events" }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }

      let query = externalSupabase.from(table).delete();
      
      for (const [column, value] of Object.entries(filters)) {
        query = query.eq(column, value as string | number | boolean);
      }

      const { error, count } = await query;

      if (error) {
        console.error(`Error deleting from ${table}:`, error);
        return new Response(
          JSON.stringify({ error: "Failed to delete data" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const clubIdForLog = (filters.club_handle || filters.club_id || filters.id || 'unknown') as string;
      await logAuditEvent(internalSupabase, {
        club_id: clubIdForLog,
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

    // ============ DELETE PAST EVENTS ============
    if (req.method === "POST" && action === "delete-past-events") {
      if (table !== "events") {
        return new Response(
          JSON.stringify({ error: "This action is only allowed for events table" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      console.log(`Deleting past events (before ${todayISO})`);

      const { data: pastEvents, error: fetchError } = await externalSupabase
        .from("events")
        .select("id, title, start_time")
        .lt("start_time", todayISO);

      if (fetchError) {
        console.error("Error fetching past events:", fetchError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch past events" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const count = pastEvents?.length || 0;
      console.log(`Found ${count} past events to delete`);

      if (count > 0) {
        const ids = pastEvents!.map((e: { id: string }) => e.id);
        const { error: deleteError } = await externalSupabase
          .from("events")
          .delete()
          .in("id", ids);

        if (deleteError) {
          console.error("Error deleting past events:", deleteError);
          return new Response(
            JSON.stringify({ error: "Failed to delete past events" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      await logAuditEvent(internalSupabase, {
        club_id: 'system',
        actor_user_id: userId,
        action: 'events_delete_past',
        details: { deleted_count: count, before_date: todayISO },
        ip_address: ipAddress,
      });

      return new Response(
        JSON.stringify({ success: true, deleted: count }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ BULK DELETE EVENTS ============
    if (req.method === "POST" && action === "delete-all-events") {
      if (table !== "events") {
        return new Response(
          JSON.stringify({ error: "This action is only allowed for events table" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Require authentication for bulk delete
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Authentication required" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Deleting all events from external database");

      const { error } = await externalSupabase
        .from("events")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) {
        console.error("Error deleting all events:", error);
        return new Response(
          JSON.stringify({ error: "Failed to delete events" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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