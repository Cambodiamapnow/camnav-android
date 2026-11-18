/* CamNAV cloud settings. The GitHub build rewrites the Supabase part of this file from
 * the repository secrets SUPABASE_URL and SUPABASE_ANON_KEY (the anon key is public by
 * design; Row Level Security in supabase/schema.sql protects the data).
 * Empty Supabase values = offline mode: reports stay on the phone, no sign-in.
 *
 * Payments: khqrStatic is the owner's ABA KHQR, copied unchanged from the ABA app
 * (changing anything inside it, even the name, can make banks reject it).
 * payeeBrand is the name shown big on CamNAV's payment card. */
window.CAMNAV_CONFIG = {
  supabaseUrl: "", supabaseAnonKey: "", googleLogin: true, phoneLogin: true,
  payeeBrand: "K'MAP",
  payeeAccountName: "PISEY CHANTHA",
  khqrStatic: "00020101021129450016abaakhppxxx@abaa01090130370440208ABA Bank40600006abaP2P0112483A33969AA7020901303704403090130370450404Dual5204599953031165802KH5913PISEY CHANTHA6010Phnom Penh630473CB",
  priceUsd: 1,
  // true = every voice character is open for everyone (no Pro needed). Set to false to lock them behind Pro again.
  freeVoices: true,
};
