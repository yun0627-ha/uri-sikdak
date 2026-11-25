import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { configured } from './lib/supabase.js';
import { useAuth } from './hooks/useAuth.jsx';
import { FullScreenMessage, Spinner } from './components/ui.jsx';
import Login from './pages/Login.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Tables from './pages/Tables.jsx';
import Join from './pages/Join.jsx';
import SharedView from './pages/SharedView.jsx';
import TableLayout from './pages/TableLayout.jsx';
import Calendar from './pages/Calendar.jsx';
import Recipes from './pages/Recipes.jsx';
import RecipeDetail from './pages/RecipeDetail.jsx';
import Shopping from './pages/Shopping.jsx';
import Stats from './pages/Stats.jsx';
import Settings from './pages/Settings.jsx';

// 로그인 · 닉네임이 필요한 화면
function NeedAuth({ children }) {
  const { session, profile, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <FullScreenMessage><Spinner /></FullScreenMessage>;
  if (!session) {
    try { sessionStorage.setItem('after-login', loc.pathname + loc.search); } catch (e) { /* 무시 */ }
    return <Login />;
  }
  if (!profile) return <Onboarding />;
  return children;
}

export default function App() {
  if (!configured) {
    return (
      <FullScreenMessage title="Supabase 연결이 필요해요">
        프로젝트 폴더에 <code>.env</code> 파일을 만들고<br />VITE_SUPABASE_URL 과 VITE_SUPABASE_ANON_KEY 를 넣어 주세요.<br />자세한 방법은 README.md 에 있어요.
      </FullScreenMessage>
    );
  }
  return (
    <Routes>
      <Route path="/s/:code" element={<SharedView />} />
      <Route path="/j/:code" element={<NeedAuth><Join /></NeedAuth>} />
      <Route path="/" element={<NeedAuth><Tables /></NeedAuth>} />
      <Route path="/t/:tableId" element={<NeedAuth><TableLayout /></NeedAuth>}>
        <Route index element={<Calendar />} />
        <Route path="recipes" element={<Recipes />} />
        <Route path="recipes/:recipeId" element={<RecipeDetail />} />
        <Route path="shopping" element={<Shopping />} />
        <Route path="stats" element={<Stats />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
