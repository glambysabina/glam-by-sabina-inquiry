 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/script.js b/script.js
new file mode 100644
index 0000000000000000000000000000000000000000..cbf1a0bac68fb3d96627f2d1cffc93eb3ed0619f
--- /dev/null
+++ b/script.js
@@ -0,0 +1,90 @@
+const form = document.getElementById("bridal-inquiry-form");
+const statusEl = document.getElementById("form-status");
+const submitBtn = document.getElementById("submit-btn");
+let isSubmitting = false;
+
+function setStatus(message, type = "") {
+  statusEl.textContent = message;
+  statusEl.className = type;
+}
+
+function buildPath(prefix, file) {
+  const ext = file.name.split(".").pop();
+  return `${prefix}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
+}
+
+async function uploadSingle(bucket, file, prefix) {
+  const filePath = buildPath(prefix, file);
+  const { error } = await supabaseClient.storage.from(bucket).upload(filePath, file, { upsert: false });
+  if (error) throw error;
+  const { data } = supabaseClient.storage.from(bucket).getPublicUrl(filePath);
+  return data.publicUrl;
+}
+
+form.addEventListener("submit", async (event) => {
+  event.preventDefault();
+  if (!form.checkValidity()) {
+    form.reportValidity();
+    return;
+  }
+  if (!supabaseClient) {
+    setStatus("Supabase credentials are missing. Please finish setup in supabase.js.", "error");
+    return;
+  }
+  if (isSubmitting) return;
+
+  const formData = new FormData(form);
+  const dedupeKey = `${formData.get("email")}-${formData.get("event_date")}`;
+  if (localStorage.getItem(`submitted-${dedupeKey}`)) {
+    setStatus("This inquiry appears to have already been submitted. If needed, please email Sabina directly.", "error");
+    return;
+  }
+
+  try {
+    isSubmitting = true;
+    submitBtn.disabled = true;
+    setStatus("Submitting your inquiry...", "");
+
+    const selfieFile = formData.get("selfie");
+    const inspoFiles = Array.from(form.querySelector("input[name='inspo_images']").files).slice(0, 6);
+
+    const selfieUrl = await uploadSingle("selfies", selfieFile, "selfies");
+    const inspoUrls = [];
+    for (const file of inspoFiles) {
+      inspoUrls.push(await uploadSingle("inspo-images", file, "inspo"));
+    }
+
+    const payload = {
+      full_name: formData.get("full_name"),
+      email: formData.get("email"),
+      instagram: formData.get("instagram") || null,
+      event_date: formData.get("event_date"),
+      venue: formData.get("venue"),
+      getting_ready_location: formData.get("getting_ready_location") || null,
+      service_type: formData.get("service_type"),
+      makeup_count: Number(formData.get("makeup_count")) || null,
+      hair_count: Number(formData.get("hair_count")) || null,
+      extensions_needed: formData.get("extensions_needed") || null,
+      getting_ready_time: formData.get("getting_ready_time") || null,
+      ceremony_time: formData.get("ceremony_time") || null,
+      glam_description: formData.get("glam_description") || null,
+      allergies: formData.get("allergies") || null,
+      additional_notes: formData.get("additional_notes") || null,
+      selfie_url: selfieUrl,
+      inspo_urls: inspoUrls,
+    };
+
+    const { error } = await supabaseClient.from("inquiries").insert([payload]);
+    if (error) throw error;
+
+    localStorage.setItem(`submitted-${dedupeKey}`, new Date().toISOString());
+    form.reset();
+    setStatus("Thank you. Your inquiry was received beautifully and will be personally reviewed by Sabina.", "success");
+  } catch (error) {
+    console.error(error);
+    setStatus("We couldn't submit your inquiry right now. Please email glambysabina@yahoo.com directly.", "error");
+  } finally {
+    isSubmitting = false;
+    submitBtn.disabled = false;
+  }
+});
 
EOF
)
