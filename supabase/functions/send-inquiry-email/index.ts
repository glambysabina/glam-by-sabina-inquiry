const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const TO_EMAIL = Deno.env.get("TO_EMAIL") ?? "glambysabina@yahoo.com";
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "onboarding@resend.dev";

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY secret is not set");
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = buildEmailHtml(payload);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        reply_to: payload.email,
        subject: "New Glam by Sabina Inquiry",
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error", data);
      return new Response(JSON.stringify({ error: data }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error("Edge Function error", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

type Payload = Record<string, unknown>;

function row(label: string, value: unknown): string {
  if (!value || value === "—") return "";
  return `
    <tr>
      <td style="padding:7px 14px;color:#7c7874;font-size:14px;white-space:nowrap;vertical-align:top;border-bottom:1px solid #f0ede8;">${label}</td>
      <td style="padding:7px 14px;font-size:14px;vertical-align:top;border-bottom:1px solid #f0ede8;white-space:pre-wrap;">${value}</td>
    </tr>`;
}

function buildEmailHtml(p: Payload): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#faf9f7;font-family:Georgia,serif;color:#1a1918;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e1dc;border-radius:4px;overflow:hidden;max-width:600px;width:100%;">

        <tr><td style="background:#1a1918;padding:22px 28px;">
          <p style="margin:0;color:#ffffff;font-size:16px;letter-spacing:0.1em;font-family:Georgia,serif;">GLAM BY SABINA</p>
          <p style="margin:5px 0 0;color:#bfb9b3;font-size:12px;letter-spacing:0.15em;font-family:Georgia,serif;">NEW INQUIRY</p>
        </td></tr>

        <tr><td style="padding:24px 14px 8px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:1px solid #e5e1dc;">
            ${row("Name", p.name)}
            ${row("Email", p.email)}
            ${row("Event Date", p.event_date)}
            ${row("Venue", p.venue)}
            ${row("Service Requested", p.service_requested)}
            ${row("Party Size", p.party_size)}
            ${row("Vision", p.describe_your_vision)}
            ${row("Additional Notes", p.additional_notes)}
          </table>
        </td></tr>

        <tr><td style="border-top:1px solid #e5e1dc;padding:18px 28px;">
          <p style="margin:0;font-size:12px;color:#bfb9b3;">Reply directly to this email to respond to ${p.name}.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
