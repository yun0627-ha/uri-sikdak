import { createClient } from '@supabase/supabase-js';

// 공개(anon) 키라서 앱 코드에 들어가도 괜찮아요. 권한은 데이터베이스(RLS)에서 지켜요.
// 다른 Supabase 프로젝트로 바꾸려면 .env 의 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 로 덮어쓰면 돼요.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://lakgasbtgiukfwntcfgn.supabase.co';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxha2dhc2J0Z2l1a2Z3bnRjZmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU2MTgwNDcsImV4cCI6MjExMTE5NDA0N30.4bJa_5k7FtJzpPH8NdT2SpAjgbs3ixWOwksQyH50scY';

export const configured = Boolean(url && key);
export const supabase = configured
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;
