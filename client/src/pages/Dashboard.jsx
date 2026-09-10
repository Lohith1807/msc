import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { platformAPI, psychiatristAPI, userDashboardAPI } from '../services/api';
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
import UserConsultationsList from '../components/user/UserConsultationsList';
import BookAppointment from '../components/user/BookAppointment';
import BookingHistory from '../components/user/BookingHistory';
import DevLogs from '../components/dev/DevLogs';
import '../features/dashboard/dashboard.css';

export default function Dashboard() {
  const { user, role, isAdmin, isDev } = useAuth();
  const [activeView, setActiveView] = useState('cards'); // 'cards' | 'admin-cards' | 'responses' | 'users' | 'logs' | 'profile' | 'psychiatrist-patients' | 'book-appointment' | 'booking-history' | 'dev-logs'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [stats, setStats] = useState({
    totalCards: 0,
    totalUsers: 0,
    totalResponses: 0,
    myTotalPatients: 0,
    myPatientTotalResponses: 0,
    myTotalBookedAppointments: 0,
    totalConsultations: 0,
    evaluatedConsultations: 0,
  });
  const [cards, setCards] = useState([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingCards, setIsLoadingCards] = useState(true);

  // Selected Card for 3D inspection modal
  const [selectedCard, setSelectedCard] = useState(null);

  // Load Stats from backend (scoped for user, psychiatrist, or global for admin/dev)
  const loadStats = useCallback(async () => {
    try {
      let res;
      if (role === 'user') {
        res = await userDashboardAPI.getStats();
      } else if (role === 'psychiatrist') {
        res = await psychiatristAPI.getStats();
      } else {
        // admin and dev both use platform-wide stats
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

  // Load Active Cards from backend for Home Page Carousel (Admin/Psychiatrist)
  const loadCards = useCallback(async () => {
    if (role === 'user') {
      setIsLoadingCards(false);
      return;
    }
    try {
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
  }, [role]);

  useEffect(() => {
    if (activeView === 'cards') {
      loadStats();
      loadCards();
    }
  }, [activeView, loadStats, loadCards]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeView]);

  // Security / Role guard: Enforce strict module access per role
  useEffect(() => {
    if (role === 'psychiatrist') {
      const allowedViews = ['cards', 'profile', 'psychiatrist-patients'];
      if (!allowedViews.includes(activeView)) {
        setActiveView('cards');
      }
    } else if (role === 'user') {
      const allowedViews = ['cards', 'profile', 'book-appointment', 'booking-history'];
      if (!allowedViews.includes(activeView)) {
        setActiveView('cards');
      }
    } else if (role === 'dev') {
      // dev gets all admin views + dev-logs
      const allowedViews = ['cards', 'profile', 'admin-cards', 'responses', 'users', 'logs', 'dev-logs'];
      if (!allowedViews.includes(activeView)) {
        setActiveView('cards');
      }
    }
    // admin has no restriction
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
    loadStats(); // Update stats live!
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
        {/* Home View (Default): 3 Stat Cards in a row */}
        {activeView === 'cards' && (
          <>
            <StatCards
              stats={stats}
              isLoading={isLoadingStats}
              role={role}
              onCardClick={(targetView) => {
                if (role === 'user') {
                  if (targetView === 'booking-history') {
                    setActiveView('booking-history');
                  } else {
                    setActiveView('cards');
                  }
                } else if (role === 'psychiatrist') {
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

            {/* If User Role: Show Consultation List below the 3 Stat Boxes */}
            {role === 'user' ? (
              <UserConsultationsList onSelectView={handleSelectView} />
            ) : (
              <CardCarousel
                cards={cards}
                onSelectCard={(card) => setSelectedCard(card)}
              />
            )}
          </>
        )}

        {/* User Book An Appointment Module */}
        {activeView === 'book-appointment' && (
          <BookAppointment
            onAppointmentBooked={loadStats}
            onNavigateToHistory={() => setActiveView('booking-history')}
          />
        )}

        {/* User Booking History Module */}
        {activeView === 'booking-history' && (
          <BookingHistory
            onNavigateToBook={() => setActiveView('book-appointment')}
          />
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

        {/* Dev Logs (dev role only) */}
        {activeView === 'dev-logs' && (role === 'dev' || role === 'admin') && (
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
            <DevLogs />
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
