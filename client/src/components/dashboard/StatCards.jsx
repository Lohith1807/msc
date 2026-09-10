import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function StatCards({ stats, isLoading, onCardClick, role: propRole }) {
  const { role: authRole } = useAuth();
  const role = propRole || authRole;
  const isPsychiatrist = role === 'psychiatrist';
  const isUser = role === 'user';

  // DSA: Memoized O(1) View Model computation
  const cardsData = useMemo(() => {
    if (isUser) {
      return [
        {
          id: 'my-booked-appointments',
          viewId: 'booking-history',
          title: (
            <>
              My Total Booked<br />Appointments
            </>
          ),
          ariaTitle: 'My Total Booked Appointments',
          count: stats?.myTotalBookedAppointments ?? 0,
          label: 'Scheduled',
          icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 16l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ),
          accentColor: 'var(--cyan)',
          bgLight: 'rgba(42, 159, 176, 0.12)',
        },
        {
          id: 'user-total-consultations',
          viewId: 'cards',
          title: (
            <>
              Total<br />Consultations
            </>
          ),
          ariaTitle: 'Total Consultations',
          count: stats?.totalConsultations ?? 0,
          label: 'Sessions',
          icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ),
          accentColor: 'var(--navy)',
          bgLight: 'rgba(28, 58, 82, 0.1)',
        },
        {
          id: 'user-evaluated-consultations',
          viewId: 'cards',
          title: (
            <>
              Evaluated<br />Consultations
            </>
          ),
          ariaTitle: 'Evaluated Consultations',
          count: stats?.evaluatedConsultations ?? 0,
          label: 'Evaluated',
          icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ),
          accentColor: '#278c77',
          bgLight: 'rgba(39, 140, 119, 0.12)',
        },
      ];
    }

    return [
      {
        id: 'total-cards',
        viewId: 'cards',
        title: (
          <>
            Total<br />Cards
          </>
        ),
        ariaTitle: 'Total Cards',
        count: stats?.totalCards ?? 0,
        label: 'Active Deck',
        icon: (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
            <path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ),
        accentColor: 'var(--cyan)',
        bgLight: 'rgba(42, 159, 176, 0.12)',
      },
      {
        id: isPsychiatrist ? 'my-total-patients' : 'total-users',
        viewId: isPsychiatrist ? 'psychiatrist-patients' : 'users',
        title: isPsychiatrist ? (
          <>
            My Total<br />Patients
          </>
        ) : (
          <>
            Total<br />Users
          </>
        ),
        ariaTitle: isPsychiatrist ? 'My Total Patients' : 'Total Users',
        count: isPsychiatrist ? (stats?.myTotalPatients ?? 0) : (stats?.totalUsers ?? 0),
        label: isPsychiatrist ? 'Consulted' : 'Accounts',
        icon: (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ),
        accentColor: 'var(--navy)',
        bgLight: 'rgba(28, 58, 82, 0.1)',
      },
      {
        id: isPsychiatrist ? 'my-patient-responses' : 'total-responses',
        viewId: isPsychiatrist ? 'psychiatrist-patients' : 'responses',
        title: isPsychiatrist ? (
          <>
            My Patient Total<br />Responses
          </>
        ) : (
          <>
            Total<br />Responses
          </>
        ),
        ariaTitle: isPsychiatrist ? 'My Patient Total Responses' : 'Total Responses',
        count: isPsychiatrist ? (stats?.myPatientTotalResponses ?? 0) : (stats?.totalResponses ?? 0),
        label: isPsychiatrist ? 'Submissions' : 'Reflections',
        icon: (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
        accentColor: '#278c77',
        bgLight: 'rgba(39, 140, 119, 0.12)',
      },
    ];
  }, [isUser, isPsychiatrist, stats]);

  return (
    <section className="stat-cards-grid" aria-label="System statistics summary">
      {cardsData.map((card) => (
        <div
          key={card.id}
          className="stat-card"
          onClick={() => onCardClick && onCardClick(card.viewId)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onCardClick && onCardClick(card.viewId)}
          aria-label={`${card.ariaTitle || 'Stat'}: ${card.count}`}
        >
          <div
            className="stat-card-icon-wrap"
            style={{ color: card.accentColor, backgroundColor: card.bgLight }}
          >
            {card.icon}
          </div>

          <div className="stat-card-number">
            {isLoading ? (
              <span className="stat-skeleton-pulse">--</span>
            ) : (
              card.count.toLocaleString()
            )}
          </div>

          <div className="stat-card-title-bottom">
            <span className="stat-card-title">{card.title}</span>
            <span className="stat-card-sublabel">{card.label}</span>
          </div>
        </div>
      ))}
    </section>
  );
}
