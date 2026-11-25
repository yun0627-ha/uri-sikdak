import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileFor, setProfileFor] = useState(null); // 프로필을 다 불러온 사용자 id

  const loadProfile = useCallback(async uid => {
    if (!uid) { setProfile(null); setProfileFor(null); return; }
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    setProfile(data || null); setProfileFor(uid);
  }, []);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      await loadProfile(data.session?.user?.id);
      if (alive) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      // 콜백 안에서 바로 await 하지 않기 (Supabase 권장)
      setTimeout(() => loadProfile(s?.user?.id), 0);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  // 메일로 로그인 링크 보내기 (무료 요금제 기본 메일 그대로 사용)
  const sendCode = email => {
    let to = '/';
    try { to = sessionStorage.getItem('after-login') || '/'; } catch (e) { /* 무시 */ }
    return supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true, emailRedirectTo: window.location.origin + to } });
  };
  const verifyCode = (email, token) => supabase.auth.verifyOtp({ email: email.trim(), token: token.trim(), type: 'email' });
  const signOut = () => supabase.auth.signOut();
  const saveProfile = async ({ nickname, tint }) => {
    const row = { id: session.user.id, nickname: nickname.trim().slice(0, 12), tint };
    const { data, error } = await supabase.from('profiles').upsert(row).select().single();
    if (error) throw error;
    setProfile(data); setProfileFor(data.id);
    return data;
  };

  return (
    <AuthCtx.Provider value={{ session, user: session?.user || null, profile, loading: loading || Boolean(session && profileFor !== session.user.id), sendCode, verifyCode, signOut, saveProfile }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
