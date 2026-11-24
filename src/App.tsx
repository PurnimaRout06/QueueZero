import { useCallback, useEffect, useState } from 'react';
import { api, setAuthToken } from './api/client';
import { AuthPage } from './components/AuthPage';
import { DashboardPage } from './components/DashboardPage';
import { LandingPage } from './components/LandingPage';
import { NewCasePage } from './components/NewCasePage';
import { SettingsPrivacyPage } from './components/SettingsPrivacyPage';
import { TopNav, type AppView } from './components/TopNav';
import { CaseWorkspacePage } from './components/case/CaseWorkspacePage';
import type { CaseRecord, UserProfile } from './types';

export default function App() {
  const [view, setView] = useState<AppView>('landing');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isDemoSession, setIsDemoSession] = useState(false);
  const [geminiConfigured, setGeminiConfigured] = useState(false);

  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [recentActivity, setRecentActivity] = useState<
    Array<{
      id: string;
      caseId: string;
      caseTitle: string;
      action: string;
      description: string;
      timestamp: string;
    }>
  >([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const refreshDashboard = useCallback(async () => {
    setLoadingCases(true);
    try {
      const res = await api.listCases();
      setCases(res.cases);
      setRecentActivity(res.recentActivity);
    } finally {
      setLoadingCases(false);
    }
  }, []);

  useEffect(() => {
    api
      .health()
      .then((h) => setGeminiConfigured(h.geminiConfigured))
      .catch(() => setGeminiConfigured(false));

    // Support ?autostart=1 for automated inspection / quick demo entry
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      api
        .loginDemo()
        .then((res) => {
          setAuthToken(res.token);
          setUser(res.user);
          setIsDemoSession(true);
          setView('dashboard');
          return refreshDashboard();
        })
        .catch(() => {
          // Stay on landing if demo login fails
        });
    }
  }, [refreshDashboard]);

  const handleAuthenticated = async (authUser: UserProfile, demo: boolean) => {
    setUser(authUser);
    setIsDemoSession(demo);
    setView('dashboard');
    await refreshDashboard();
  };

  const handleResolveIssueCta = async () => {
    if (user) {
      setView('new-case');
      return;
    }
    setView('auth');
  };

  const handleSignOut = () => {
    setAuthToken(null);
    setUser(null);
    setIsDemoSession(false);
    setCases([]);
    setRecentActivity([]);
    setSelectedCaseId(null);
    setView('landing');
  };

  const handleNavigate = (nextView: AppView) => {
    if (!user && nextView !== 'landing' && nextView !== 'auth') {
      setView('auth');
      return;
    }
    setView(nextView);
    if (nextView === 'dashboard' && user) {
      refreshDashboard();
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    await api.deleteCase(caseId);
    await refreshDashboard();
  };

  const handleCaseLaunched = (caseId: string) => {
    setSelectedCaseId(caseId);
    setView('case-detail');
    refreshDashboard();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopNav
        currentView={view}
        user={user}
        onNavigate={handleNavigate}
        onStartDemo={handleResolveIssueCta}
        onSignOut={handleSignOut}
      />

      <main className="flex-1">
        {view === 'landing' && (
          <LandingPage
            onResolveIssue={handleResolveIssueCta}
            onOpenAuth={() => setView('auth')}
          />
        )}

        {view === 'auth' && (
          <AuthPage
            onAuthenticated={handleAuthenticated}
            onCancel={() => setView('landing')}
          />
        )}

        {view === 'dashboard' && user && (
          <DashboardPage
            userName={user.name}
            isDemoSession={isDemoSession}
            cases={cases}
            recentActivity={recentActivity}
            loading={loadingCases}
            onStartNewCase={() => setView('new-case')}
            onOpenCase={(id) => {
              setSelectedCaseId(id);
              setView('case-detail');
            }}
            onDeleteCase={handleDeleteCase}
          />
        )}

        {view === 'new-case' && user && (
          <NewCasePage
            geminiConfigured={geminiConfigured}
            onBack={() => setView('dashboard')}
            onCaseLaunched={(id) => handleCaseLaunched(id)}
          />
        )}

        {view === 'case-detail' && user && selectedCaseId && (
          <CaseWorkspacePage
            caseId={selectedCaseId}
            geminiConfigured={geminiConfigured}
            onBack={() => {
              setView('dashboard');
              refreshDashboard();
            }}
            onCaseDeleted={() => {
              setSelectedCaseId(null);
              setView('dashboard');
              refreshDashboard();
            }}
          />
        )}

        {view === 'settings' && user && (
          <SettingsPrivacyPage
            user={user}
            cases={cases}
            onDeleteCase={handleDeleteCase}
          />
        )}
      </main>
    </div>
  );
}
