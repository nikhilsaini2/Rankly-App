import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    // 1. Extract and validate the bearer token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace("Bearer ", "");

    // 2. Verify the token and get the real user — prevents userId spoofing
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token);

    if (userError || !user) {
      return new Response("Invalid token", { status: 401, headers: corsHeaders });
    }

    // 3. Delete all user data using the service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Delete all data associated with this user before removing the auth record.
    // Order matters: delete dependent tables before the users row.
    const tablesToDelete = [
      "resume_builds",
      "ats_scores",
      "interview_sessions",
      "resumes",
    ];

    for (const table of tablesToDelete) {
      await supabaseAdmin.from(table).delete().eq("user_id", user.id);
    }

    // Delete the users profile row (uses auth_id as FK)
    await supabaseAdmin.from("users").delete().eq("auth_id", user.id);

    // Finally delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      return new Response(deleteError.message, { status: 400, headers: corsHeaders });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(String(e), { status: 500, headers: corsHeaders });
  }
});
