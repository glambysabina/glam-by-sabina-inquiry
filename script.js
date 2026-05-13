// ─── EmailJS Configuration ────────────────────────────────────────────────────
// HOW TO SET UP:
// 1. Create a free account at https://www.emailjs.com
// 2. Add a service (choose Yahoo Mail) — copy the Service ID below.
// 3. Create an email template — copy the Template ID below.
//    In the template, set To Email = glambysabina@yahoo.com
//    Use {{reply_to}} as the Reply-To address so Sabina can reply directly to the bride.
//    Use the variable names in the payload below (e.g. {{bride_name}}, {{event_date}}) in your template body.
// 4. Copy your Public Key from EmailJS Account > API Keys.
// 5. Paste the three values into the constants below.

const EMAILJS_PUBLIC_KEY  = "YOUR_EMAILJS_PUBLIC_KEY";   // ← paste your EmailJS public key here
const EMAILJS_SERVICE_ID  = "YOUR_EMAILJS_SERVICE_ID";   // ← paste your EmailJS service ID here
const EMAILJS_TEMPLATE_ID = "YOUR_EMAILJS_TEMPLATE_ID";  // ← paste your EmailJS template ID here

if (typeof emailjs !== 'undefined') {
  emailjs.init(EMAILJS_PUBLIC_KEY);
} else {
  console.warn('EmailJS failed to load — email notifications will be skipped.');
}

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
      additional_notes: formData.get("additional_notes") || null,
      selfie_url: selfieUrl,
      inspo_urls: inspoUrls,
    };

    const { error: dbError } = await supabaseClient.from("inquiries").insert([payload]);
    if (dbError) {
      dbError.stage = "db_insert";
      throw dbError;
    }

    // Send email notification via EmailJS — only fires after a successful Supabase insert.
    // Email failure is non-fatal: the inquiry is already saved and Sabina can view it in Supabase.
    if (typeof emailjs !== 'undefined') {
      try {
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
          // reply_to allows Sabina to click Reply and respond directly to the bride's email address.
          reply_to:   payload.email,
          from_name:  payload.full_name,
          bride_email: payload.email,

          // Inquiry details — use these variable names in your EmailJS template.
          bride_name:             payload.full_name,
          instagram:              payload.instagram || "—",
          event_date:             payload.event_date,
          venue:                  payload.venue,
          getting_ready_location: payload.getting_ready_location || "—",
          service_type:           payload.service_type,
          makeup_count:           payload.makeup_count ?? "—",
          hair_count:             payload.hair_count ?? "—",
          extensions_needed:      payload.extensions_needed || "—",
          getting_ready_time:     payload.getting_ready_time || "—",
          ceremony_time:          payload.ceremony_time || "—",
          glam_description:       payload.glam_description || "—",
          allergies:              payload.allergies || "—",
          additional_notes:       payload.additional_notes || "—",
          selfie_url:             selfieUrl,
          inspo_urls:             inspoUrls.length ? inspoUrls.join("\n") : "None provided",
        });
      } catch (emailError) {
        console.error("EmailJS send failed (inquiry already saved to Supabase):", emailError);
      }
    } else {
      console.warn("EmailJS not available — email notification skipped. Inquiry saved to Supabase.");
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
