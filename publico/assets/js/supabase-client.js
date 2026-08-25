import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://mmpgtisexctsruinodyp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_kAa2x9DmqvvY0G7eFSMG2Q_FH3ShYKM";

// Chave publishable/anon pode ficar no front-end. Nunca usar service_role aqui.
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
