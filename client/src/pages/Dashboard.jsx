import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { platformAPI, psychiatristAPI } from '../services/api';
import TopBar from '../components/layout/TopBar';
import Sidebar from '../components/layout/Sidebar';
import StatCards from '../components/dashboard/StatCards';
import CardCarousel from '../components/cards/CardCarousel';
import CardModal from '../components/cards/CardModal';
import AdminCardManager from '../components/admin/AdminCardManager';
import AdminResponses from '../components/admin/AdminResponses';
import AdminUsers from '../components/admin/AdminUsers';
import AdminLogs from '../components/admin/AdminLogs';
import ProfileView from '../components/profile/ProfileView';
import PsychiatristPatients from '../components/psychiatrist/PsychiatristPatients';
import '../features/dashboard/dashboard.css';

export default function Dashboard() {
  const { user, role, isAdmin } = useAuth();
  const [activeView, setActiveView] = useState('cards'); // 'cards' | 'admin-cards' | 'responses' | 'users' | 'logs' | 'profile' | 'psychiatrist-patients'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [stats, setStats] = useState({
    totalCards: 0,
    totalUsers: 0,
    totalResponses: 0,
    myTotalPatients: 0,
    myPatientTotalResponses: 0,
  });
  const [cards, setCards] = useState([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingCards, setIsLoadingCards] = useState(true);

  // Selected Card for 3D inspection modal
  const [selectedCard, setSelectedCard] = useState(null);

  // Load Stats from backend (scoped for psychiatrist, or global for admin)
  const loadStats = useCallback(async () => {
    try {
      let res;
      if (role === 'psychiatrist') {
        res = await psychiatristAPI.getStats();
      } else {
        res = await platformAPI.getStats();
      }
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.warn('Could not load live stats:', err.message);
    } finally {
      setIsLoadingStats(false);
    }
  }, [role]);

  // Load Active Cards from backend for Home Page Carousel
  const loadCards = useCallback(async () => {
    try {
      // Home page carousel strictly shows active cards
      const res = await platformAPI.getCards(false);
      if (res.success && res.cards) {
        const activeCards = (res.cards || []).filter((c) => c.status === 'active');
        setCards(activeCards);
      }
    } catch (err) {
      console.warn('Could not load cards:', err.message);
    } finally {
      setIsLoadingCards(false);
    }
  }, []);

  useEffect(() => {
    if (activeView === 'cards') {
      loadStats();
      loadCards();
    }
  }, [activeView, loadStats, loadCards]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeView]);

  // Security / Role guard: If psychiatrist, restrict to cards, profile, psychiatrist-patients
  useEffect(() => {
    if (role === 'psychiatrist') {
      const allowedViews = ['cards', 'profile', 'psychiatrist-patients'];
      if (!allowedViews.includes(activeView)) {
        setActiveView('cards');
      }
    }
  }, [role, activeView]);

  // Sidebar controls
  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleSelectView = (viewId) => {
    setActiveView(viewId);
  };

  // Triggered when a response is submitted inside the CardModal
  const handleResponseSubmitted = () => {
    loadStats(); // Update total responses count live!
  };

  // Triggered when cards are created, updated, or deleted
  const handleCardsUpdated = () => {
    loadCards();
    loadStats();
  };

  return (
    <div className="dashboard-root">
      {/* 1. Fixed TopBar with Hamburger and Avatar */}
      <TopBar
        onToggleSidebar={handleToggleSidebar}
        isSidebarOpen={isSidebarOpen}
        activeView={activeView}
        onSelectView={handleSelectView}
      />

      {/* 2. Off-canvas Sidebar Drawer */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
        activeView={activeView}
        onSelectView={handleSelectView}
      />

      {/* 3. Main Dashboard Content Area */}
      <main className="dashboard-main-area">
        {/* Home View (Default): 3 Stat Cards in a row + 3D Card Carousel */}
        {activeView === 'cards' && (
          <>
            <StatCards
              stats={stats}
              isLoading={isLoadingStats}
              role={role}
              onCardClick={(targetView) => {
                if (role === 'psychiatrist') {
                  if (targetView === 'psychiatrist-patients') {
                    setActiveView('psychiatrist-patients');
                  } else {
                    setActiveView('cards');
                  }
                } else {
                  if (targetView === 'cards' && isAdmin) {
                    setActiveView('admin-cards');
                  } else {
                    setActiveView(targetView);
                  }
                }
              }}
            />
            <CardCarousel
              cards={cards}
              onSelectCard={(card) => setSelectedCard(card)}
            />
          </>
        )}

        {/* Psychiatrist My Patients Module */}
        {activeView === 'psychiatrist-patients' && (
          <PsychiatristPatients onBackToHome={() => setActiveView('cards')} />
        )}

        {/* Admin Card Management */}
        {activeView === 'admin-cards' && (
          <>
            <div className="view-breadcrumb-bar">
              <button
                type="button"
                className="btn-back-home"
                onClick={() => setActiveView('cards')}
              >
                ← Back to Home
              </button>
            </div>
            <AdminCardManager onCardsUpdated={handleCardsUpdated} />
          </>
        )}

        {/* User Responses */}
        {activeView === 'responses' && (
          <>
            <div className="view-breadcrumb-bar">
              <button
                type="button"
                className="btn-back-home"
                onClick={() => setActiveView('cards')}
              >
                ← Back to Home
              </button>
            </div>
            <AdminResponses />
          </>
        )}

        {/* Total Users */}
        {activeView === 'users' && (
          <>
            <div className="view-breadcrumb-bar">
              <button
                type="button"
                className="btn-back-home"
                onClick={() => setActiveView('cards')}
              >
                ← Back to Home
              </button>
            </div>
            <AdminUsers onUsersUpdated={loadStats} />
          </>
        )}

        {/* Activity Logs */}
        {activeView === 'logs' && (
          <>
            <div className="view-breadcrumb-bar">
              <button
                type="button"
                className="btn-back-home"
                onClick={() => setActiveView('cards')}
              >
                ← Back to Home
              </button>
            </div>
            <AdminLogs />
          </>
        )}

        {/* Dedicated Profile & Edit Information View */}
        {activeView === 'profile' && (
          <ProfileView onSelectView={handleSelectView} />
        )}
      </main>

      {/* 4. Interactive 3D Card Modal with Rotation-Mapped Questions */}
      {selectedCard && (
        <CardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onResponseSubmitted={handleResponseSubmitted}
        />
      )}
    </div>
  );
}
