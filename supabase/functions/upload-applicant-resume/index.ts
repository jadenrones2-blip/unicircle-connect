import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const applicantId = formData.get("applicant_id") as string | null;
    const clubId = formData.get("club_id") as string | null;

    if (!file || !applicantId || !clubId) {
      return new Response(JSON.stringify({ error: "Missing file, applicant_id, or club_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (file.size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "File too large (max 10MB)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify this applicant actually exists before accepting the upload
    const { data: applicant, error: lookupErr } = await serviceClient
      .from("applicants")
      .select("id")
      .eq("id", applicantId)
      .maybeSingle();

    if (lookupErr || !applicant) {
      return new Response(JSON.stringify({ error: "Applicant not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const path = `${clubId}/${applicantId}.${ext}`;

    const fileBuffer = await file.arrayBuffer();
    const { error: uploadErr } = await serviceClient.storage
      .from("resumes")
      .upload(path, fileBuffer, { contentType: file.type || "application/pdf", upsert: true });

    if (uploadErr) {
      return new Response(JSON.stringify({ error: uploadErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a signed URL (resumes bucket is private)
    const { data: signed, error: signErr } = await serviceClient.storage
      .from("resumes")
      .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year

    const resumeUrl = signErr || !signed ? null : signed.signedUrl;

    // Patch the applicant row with the storage path so officers can fetch a fresh URL later
    await serviceClient
      .from("applicants")
      .update({ resume_url: path })
      .eq("id", applicantId);

    return new Response(JSON.stringify({ path, url: resumeUrl }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
