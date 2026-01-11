import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://xrcaencngmyjxtxppuye.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_IsroScg09MJCniMGU4L6TA_RKyIlLDL";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
