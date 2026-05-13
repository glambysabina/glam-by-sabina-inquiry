// ─── Email Notification Setup ─────────────────────────────────────────────────
// After each successful inquiry insert, a Supabase Edge Function calls Resend
// to email glambysabina@yahoo.com. Email failure is non-fatal — the inquiry is
// already saved and visible in the Supabase dashboard.
//
// SETUP (one-time):
// 1. Create a free account at https://resend.com
//    - Verify your sending domain under Resend > Domains
//      (during initial testing you can skip this — see note in the Edge Function)
//    - Copy your API key from Resend > API Keys
//
// 2. In Supabase Dashboard > Project Settings > Edge Functions > Secrets, add:
//    RESEND_API_KEY = (your Resend API key)
//    TO_EMAIL       = glambysabina@yahoo.com
//    FROM_EMAIL     = you@yourverifieddomain.com  (add once domain is verified)
//
// 3. Deploy the Edge Function once from your terminal:
//    npx supabase functions deploy send-inquiry-email --project-ref jdmzhqneamuzcfnzdyui
//
// 4. Submit a test inquiry and verify:
//    - Supabase Dashboard > Edge Functions > send-inquiry-email > Logs
//    - Inbox at glambysabina@yahoo.com
// ─────────────────────────────────────────────────────────────────────────────

const form = document.getElementById("bridal-inquiry-form");
const statusEl = document.getElementById("form-status");
const submitBtn = document.getElementById("submit-btn");
let isSubmitting = false;

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = type;
}

function buildPath(prefix, file) {
  const rawExt = (file.name.includes(".") ? file.name.split(".").pop() : "") || "";
  const typeExt = (file.type || "").split("/").pop() || "";
  const normalizedExt = (rawExt || typeExt || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const ext = normalizedExt || "jpg";
  return `${prefix}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
}

async function uploadSingle(bucket, file, prefix) {
  const filePath = buildPath(prefix, file);
  const { error } = await supabaseClient.storage.from(bucket).upload(filePath, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) {
    console.error("Upload failed", { bucket, filePath, fileName: file.name, fileType: file.type, error });
    throw error;
  }
  const { data } = supabaseClient.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  if (!supabaseClient) {
    setStatus("Supabase credentials are missing. Please finish setup in supabase.js.", "error");
    return;
  }
  if (isSubmitting) return;

  const formData = new FormData(form);
  const dedupeKey = `${formData.get("email")}-${formData.get("event_date")}`;
  if (localStorage.getItem(`submitted-${dedupeKey}`)) {
    setStatus("This inquiry appears to have already been submitted. If needed, please email Sabina directly.", "error");
    return;
  }

  try {
    isSubmitting = true;
    submitBtn.disabled = true;
    setStatus("Submitting your inquiry...", "");

    const selfieFile = formData.get("selfie");
    const inspoFiles = Array.from(form.querySelector("input[name='inspo_images']").files).slice(0, 6);

    if (!selfieFile || selfieFile.size === 0) {
      throw new Error("Missing required selfie upload.");
    }

    let selfieUrl;
    let inspoUrls = [];

    try {
      selfieUrl = await uploadSingle("selfies", selfieFile, "selfies");
      for (const file of inspoFiles) {
        inspoUrls.push(await uploadSingle("inspo-images", file, "inspo"));
      }
    } catch (uploadError) {
      uploadError.stage = "storage_upload";
      throw uploadError;
    }

    // Collect party detail fields (not DB columns — appended to additional_notes)
    const partyLines = [];
    const bridesmaidsCount = formData.get("bridesmaids_count");
    const motherServices = formData.get("mother_services");
    const flowerGirlServices = formData.get("flower_girl_services");
    if (bridesmaidsCount) partyLines.push(`Bridesmaids: ${bridesmaidsCount}`);
    if (motherServices) partyLines.push(`Mother of bride/groom services: ${motherServices}`);
    if (flowerGirlServices) partyLines.push(`Flower girl services: ${flowerGirlServices}`);

    const userNotes = formData.get("additional_notes") || "";
    const combinedNotes = [
      partyLines.length ? `[Party Details] ${partyLines.join(" | ")}` : null,
      userNotes || null,
    ].filter(Boolean).join("\n") || null;

    const payload = {
      full_name: formData.get("full_name"),
      email: formData.get("email"),
      instagram: formData.get("instagram") || null,
      event_date: formData.get("event_date"),
      venue: formData.get("venue"),
      getting_ready_location: formData.get("getting_ready_location") || null,
      service_type: formData.get("service_type"),
      makeup_count: Number(formData.get("makeup_count")) || null,
      hair_count: Number(formData.get("hair_count")) || null,
      extensions_needed: formData.get("extensions_needed") || null,
      getting_ready_time: formData.get("getting_ready_time") || null,
      ceremony_time: formData.get("ceremony_time") || null,
      glam_description: formData.get("glam_description") || null,
      allergies: formData.get("allergies") || null,
      additional_notes: combinedNotes,
      selfie_url: selfieUrl,
      inspo_urls: inspoUrls,
    };

    const { error: dbError } = await supabaseClient.from("inquiries").insert([payload]);
    if (dbError) {
      dbError.stage = "db_insert";
      throw dbError;
    }

    // Send email notification via Supabase Edge Function → Resend.
    // Non-fatal: inquiry is already saved in Supabase if this fails.
    try {
      await fetch("https://jdmzhqneamuzcfnzdyui.supabase.co/functions/v1/send-inquiry-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name:                 payload.full_name,
          email:                payload.email,
          event_date:           payload.event_date,
          venue:                payload.venue,
          service_requested:    payload.service_type,
          party_size:           [
            payload.makeup_count ? `Makeup: ${payload.makeup_count}` : null,
            payload.hair_count   ? `Hair: ${payload.hair_count}`   : null,
          ].filter(Boolean).join(", ") || null,
          describe_your_vision: payload.glam_description || null,
          additional_notes:     payload.additional_notes || null,
        }),
      });
    } catch (emailError) {
      console.error("Edge Function email failed (inquiry already saved to Supabase):", emailError);
    }

    localStorage.setItem(`submitted-${dedupeKey}`, new Date().toISOString());
    form.reset();
    setStatus("Your inquiry has been received successfully. Sabina will review your submission and respond within 24–48 hours.", "success");
  } catch (error) {
    console.error("Inquiry submit failed:", {
      stage: error.stage || "unknown",
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    if (error.stage === "storage_upload") {
      setStatus("Upload failed. Please try again or email glambysabina@yahoo.com directly.", "error");
    } else {
      setStatus("We couldn't submit your inquiry right now. Please email glambysabina@yahoo.com directly.", "error");
    }
  } finally {
    isSubmitting = false;
    submitBtn.disabled = false;
  }
});
