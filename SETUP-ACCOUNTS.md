# CamNAV – sign-in, live reports & $1 coffee: switch-on guide

Everything is already in the app. These steps connect it to **your** Supabase project.
Until then the app works in offline mode (no sign-in, reports stay on the phone).

## 1. Database (5 minutes)
1. supabase.com → your project → **SQL Editor** → **New query**.
2. Paste all of `supabase/schema.sql` → **Run**. (Safe to run again later.)

## 2. Sign-in options (Supabase → Authentication)
- **Sign In / Providers → Allow anonymous sign-ins: ON** (this is "Guest mode": guests can report and vote, and keep their points when they sign in).
- **Phone (+855 OTP)**: turn on Phone and connect an SMS provider (Twilio, MessageBird or Vonage). Supabase does not send SMS by itself.
- **Google**: turn on Google, paste the Client ID / Secret from Google Cloud Console.
- **URL Configuration → Redirect URLs**: add `camnav://login`.
- **Manual linking: ON** (lets a guest attach Google to their guest account).

## 3. Connect the app (GitHub → Settings → Secrets and variables → Actions)
- `SUPABASE_URL` = Project Settings → API → Project URL
- `SUPABASE_ANON_KEY` = Project Settings → API → `anon` `public` key
Then run **Actions → Build APK → Run workflow**. The new APK has accounts switched on.

## 4. Payments
**Now – your ABA KHQR (K'MAP):** the payment screen shows your own ABA QR under the name K'MAP.
Users pay $1, write their phone number in the remark, and tap "I've paid".
To switch on Pro after you see the money in ABA:
SQL Editor → `select public.admin_activate_pro('+85512345678');` (their phone, or the reference shown to them).
See waiting payments: `select * from payment_transactions where status = 'pending' order by created_at desc;`

**Later – automatic checking (no manual step):** needs a Bakong Open API token
(api-bakong.nbc.gov.kh) and a Bakong account ID. Remove `khqrStatic` from `js/config.js`,
add the secrets listed in `.github/workflows/supabase-deploy.yml`, run **Set up Supabase**.
Note: the Bakong API may only accept requests from Cambodia; ABA PayWay (merchant account) is the other option.

**Google Play subscriptions:** need a Google Play Console account ($25 one-time) and the app published there.
