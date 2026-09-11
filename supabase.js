import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://tfaadidbsrppkcahnxvd.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_W71utkM6OI0_GnDxIP5hfQ_4AiAKK2V";

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);