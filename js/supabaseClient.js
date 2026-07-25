import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { supabasePublishableKey, supabaseUrl } from "../data/supabase.js";

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
