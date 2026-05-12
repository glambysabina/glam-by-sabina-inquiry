diff --git a/README.md b/README.md
index ab6a5d56e32c0c7313a8032efb22c5a664c80e28..2f9298fda17b7f3b6669b1151e3590f74cbd7aa4 100644
--- a/README.md
+++ b/README.md
@@ -1,2 +1,159 @@
-# glam-by-sabina-inquiry
-Luxury bridal inquiry website for Glam by Sabina.
+# Glam by Sabina — Bridal Inquiry Website
+
+Production-ready static one-page website for **Glam by Sabina** (GitHub Pages + Supabase).
+
+## Files
+- `index.html` — site markup and inquiry form
+- `styles.css` — luxury black/white editorial styling
+- `script.js` — form logic, upload flow, Supabase insert
+- `supabase.js` — Supabase client initialization
+- `.env.example` — reference credentials format
+- `assets/logo.jpeg` — logo file (replace with official brand logo)
+
+## 1) Create Supabase project
+1. Sign in to Supabase and create a new project.
+2. In **Project Settings → API**, copy:
+   - Project URL
+   - anon/public key
+
+## 2) Run SQL setup
+In **SQL Editor**, run:
+
+```sql
+create extension if not exists pgcrypto;
+
+create table inquiries (
+id uuid primary key default gen_random_uuid(),
+created_at timestamptz default now(),
+
+full_name text not null,
+email text not null,
+instagram text,
+
+event_date date not null,
+venue text not null,
+getting_ready_location text,
+
+service_type text not null,
+makeup_count int,
+hair_count int,
+extensions_needed text,
+
+getting_ready_time text,
+ceremony_time text,
+glam_description text,
+allergies text,
+additional_notes text,
+
+selfie_url text,
+inspo_urls text[],
+
+status text default 'new'
+);
+```
+
+## 3) Create storage buckets
+In **Storage**, create two buckets:
+- `selfies`
+- `inspo-images`
+
+For simple GitHub Pages operation, they can be public initially. For long-term privacy, use private buckets with controlled access once an admin dashboard exists.
+
+## 4) Add Supabase credentials
+Use one of the following:
+
+### Option A (quick): edit `supabase.js`
+Replace placeholders in `supabase.js`:
+- `YOUR_SUPABASE_URL`
+- `YOUR_SUPABASE_ANON_KEY`
+
+### Option B (preferred for local testing): use inline globals before `supabase.js`
+```html
+<script>
+  window.SUPABASE_URL = "YOUR_SUPABASE_URL";
+  window.SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
+</script>
+```
+
+## 5) Replace logo
+Replace `assets/logo.jpeg` with your official Glam by Sabina logo and keep the same filename (or update `index.html` path).
+
+## 6) Deploy on GitHub Pages
+1. Push repository to GitHub (`glambysabina/glam-by-sabina-inquiry`).
+2. Go to **Settings → Pages**.
+3. Under **Build and deployment**, set:
+   - Source: **Deploy from a branch**
+   - Branch: `main` (or active branch), folder `/ (root)`
+4. Save and wait for publish URL.
+
+## 7) Test form submission
+1. Open deployed site.
+2. Fill required fields.
+3. Upload one selfie and one or more inspiration images.
+4. Submit.
+5. Confirm:
+   - Files appear in Storage buckets
+   - Row appears in `inquiries` table with URLs
+   - Success message appears on site
+
+If upload or save fails, site displays fallback instruction to email `glambysabina@yahoo.com`.
+
+## 8) How Sabina reviews inquiries
+1. Open Supabase Table Editor → `inquiries`.
+2. Sort by `created_at` descending.
+3. Open row and review:
+   - service request
+   - timing/location
+   - selfie/inspiration URLs
+4. Update `status` manually (example: `new`, `approved`, `declined`, `booked`).
+
+## 9) Square Contracts workflow
+This site **does not** collect payment or signatures.
+
+After inquiry approval:
+1. Sabina sends approval email + pricing guide.
+2. Client confirms requested services.
+3. Sabina reviews final service set.
+4. Sabina sends:
+   - Square Contract
+   - final invoice or estimate
+   - Square deposit link ($100 non-refundable)
+5. Date is secured only when:
+   - Square Contract is signed
+   - $100 non-refundable deposit is paid
+
+## Email templates
+
+### Approval email
+**Subject:**
+Glam by Sabina — Inquiry Approved
+
+**Body:**
+Hi [Client Name],
+
+Thank you for your inquiry. I would be happy to move forward with your requested date, pending final service selection and deposit.
+
+Attached is my current bridal service menu for review.
+
+Please reply with the services you would like to book, including who will be receiving hair, makeup, trials, or any additional services.
+
+Once confirmed, I will send your Square service agreement, final invoice, and Square deposit link. A $100 non-refundable deposit is required to secure your date.
+
+Warmly,
+Sabina
+Glam by Sabina
+
+### Decline email
+**Subject:**
+Glam by Sabina — Inquiry Update
+
+**Body:**
+Hi [Client Name],
+
+Thank you so much for reaching out and considering Glam by Sabina for your special day.
+
+At this time, I’m unable to accommodate your requested date or service request. I truly appreciate your interest and wish you the best as you continue planning.
+
+Warmly,
+Sabina
+Glam by Sabina

