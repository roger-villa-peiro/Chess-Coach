import { useState, useEffect, Suspense, lazy } from 'react';
import { supabase } from './lib/supabase';
import { useSync, useAppStore } from './lib/store';
import { cn } from './lib/utils';
import {
  LayoutDashboard,
  Activity,
  Target,
  BookOpen,
  Skull,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  LogOut,
  History,
  Loader2
} from 'lucide-react';

// Components - Lazy Loaded
import { Auth } from './components/Auth'; // Keep Auth eager or lazy? Eager is fine if small, but let's keep it eager for instant login check
const LichessExercises = lazy(() => import('./components/LichessExercises').then(module => ({ default: module.LichessExercises })));
const YusupovMethod = lazy(() => import('./components/YusupovMethod').then(module => ({ default: module.YusupovMethod })));
const BlunderDungeon = lazy(() => import('./components/BlunderDungeon').then(module => ({ default: module.BlunderDungeon })));
const AICoach = lazy(() => import('./components/AICoach').then(module => ({ default: module.AICoach })));
const DashboardView = lazy(() => import('./components/DashboardView').then(module => ({ default: module.DashboardView })));
const AnalyticsView = lazy(() => import('./components/AnalyticsView').then(module => ({ default: module.AnalyticsView })));
const GameEvaluationTab = lazy(() => import('./components/GameEvaluationTab').then(module => ({ default: module.GameEvaluationTab })));

type Tab = 'dashboard' | 'lichess' | 'yusupov' | 'dungeon' | 'coach' | 'analytics' | 'evaluation';

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'analytics', label: 'Analytics', icon: <Activity className="w-5 h-5" /> },
  { id: 'evaluation', label: 'Game Analysis', icon: <History className="w-5 h-5" /> },
  { id: 'lichess', label: 'Lichess Exercises', icon: <Target className="w-5 h-5" /> },
  { id: 'yusupov', label: 'Yusupov Method', icon: <BookOpen className="w-5 h-5" /> },
  { id: 'dungeon', label: 'Blunder Dungeon', icon: <Skull className="w-5 h-5" /> },
  { id: 'coach', label: 'AI Coach', icon: <MessageSquare className="w-5 h-5" /> },
];

function App() {
  const [session, setSession] = useState<any>(null);
  const { sync, setUserId } = useSync();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isGuest, setIsGuest] = useState(false);


  // Check auth state on mount
  useEffect(() => {
    // 1. Handle Lichess OAuth Callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state) {
      import('./lib/lichessService').then(({ handleCallback }) => {
        handleCallback(code, state)
          .then((token) => {
            useAppStore.getState().setLichessToken(token);
            // Clear URL
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('Lichess connected successfully!');
          })
          .catch((err) => {
            console.error('Lichess OAuth failed:', err);
          });
      });
    }

    // 2. Handle Supabase Auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUserId(session.user.id);
        sync();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setUserId(session.user.id);
        sync();
      } else {
        setUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!session && !isGuest) {
    return <Auth onLogin={() => { }} onGuest={() => setIsGuest(true)} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      {/* Sidebar Navigation */}
      <aside
        className={cn(
          "glass-card-elevated flex flex-col transition-all duration-300 sticky top-0 h-screen m-2 mr-0",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          {!sidebarCollapsed && (
            <div>
              <h1 className="text-xl font-bold text-zinc-100">
                Chess<span className="text-amber-400">Tactics</span>
              </h1>
              <p className="text-xs text-zinc-500">Study Suite</p>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer",
                activeTab === item.id
                  ? "glass-gold text-amber-400 glow-gold-subtle"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
              )}
            >
              {item.icon}
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Footer / Logout */}
        <div className="p-2 border-t border-white/5">
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-white/5 transition-all cursor-pointer",
              sidebarCollapsed && "justify-center"
            )}
          >
            <LogOut className="w-5 h-5" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <Suspense fallback={
            <div className="flex h-[50vh] items-center justify-center">
              <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
            </div>
          }>
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'analytics' && <AnalyticsView />}
            {activeTab === 'lichess' && <LichessExercises />}
            {activeTab === 'yusupov' && <YusupovMethod />}
            {activeTab === 'dungeon' && <BlunderDungeon />}
            {activeTab === 'evaluation' && <GameEvaluationTab />}
            {activeTab === 'coach' && <AICoach />}
          </Suspense>
        </div>
      </main>
    </div>
  );
}

export default App;
