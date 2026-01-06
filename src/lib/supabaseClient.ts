
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cqmroflpiyhruljtknrw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ziw77L1aiD9Ea0oZhdyduQ_NW4VRbdl';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
