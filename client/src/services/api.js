const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Standard HTTP request wrapper
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  // Automatically attach stored token if available (supports 7-day persistent session)
  const storedToken =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('mindlab_token') || sessionStorage.getItem('mindlab_token')
      : null;
  const token = options.token || storedToken;

  // Stored role simulation header if testing
  const simulatedRole = sessionStorage.getItem('mindlab_simulated_role');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(simulatedRole ? { 'x-user-role': simulatedRole } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.errors = data.errors || {};
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (!err.status) {
      err.message = 'Unable to connect to the server. Please check your connection.';
    }
    throw err;
  }
}

export const authAPI = {
  login: (credentials) =>
    request('/auth/login', {
      method: 'POST',
      body: credentials,
    }),

  register: (userData) =>
    request('/auth/register', {
      method: 'POST',
      body: userData,
    }),

  forgotPassword: (emailData) =>
    request('/auth/forgot-password', {
      method: 'POST',
      body: emailData,
    }),

  resetPassword: (token, passwordData) =>
    request(`/auth/reset-password/${token}`, {
      method: 'POST',
      body: passwordData,
    }),

  getMe: (token) =>
    request('/auth/me', {
      method: 'GET',
      token,
    }),

  updateProfile: (profileData) =>
    request('/auth/profile', {
      method: 'PUT',
      body: profileData,
    }),

  logout: () =>
    request('/auth/logout', {
      method: 'POST',
    }),
};

export const platformAPI = {
  // Stats
  getStats: () => request('/stats', { method: 'GET' }),

  // Cards
  getCards: (showAll = false) =>
    request(`/cards${showAll ? '?all=true' : ''}`, { method: 'GET' }),

  getCard: (id) => request(`/cards/${id}`, { method: 'GET' }),

  createCard: (cardData) =>
    request('/cards', {
      method: 'POST',
      body: cardData,
    }),

  updateCard: (id, cardData) =>
    request(`/cards/${id}`, {
      method: 'PUT',
      body: cardData,
    }),

  deleteCard: (id) =>
    request(`/cards/${id}`, {
      method: 'DELETE',
    }),

  // Questions mapped to rotations
  addQuestion: (cardId, questionData) =>
    request(`/cards/${cardId}/questions`, {
      method: 'POST',
      body: questionData,
    }),

  updateQuestion: (cardId, qId, questionData) =>
    request(`/cards/${cardId}/questions/${qId}`, {
      method: 'PUT',
      body: questionData,
    }),

  deleteQuestion: (cardId, qId) =>
    request(`/cards/${cardId}/questions/${qId}`, {
      method: 'DELETE',
    }),

  reorderQuestions: (cardId, questionIds) =>
    request(`/cards/${cardId}/questions/reorder`, {
      method: 'PUT',
      body: { questionIds },
    }),

  // Helper to build clean query string without undefined or empty values
  buildQueryString: (params = {}) => {
    const cleanParams = {};
    for (const [key, value] of Object.entries(params)) {
      if (
        value !== undefined &&
        value !== null &&
        value !== '' &&
        value !== 'undefined'
      ) {
        cleanParams[key] = value;
      }
    }
    const query = new URLSearchParams(cleanParams).toString();
    return query ? `?${query}` : '';
  },

  // User Responses
  getResponses: (params = {}) => {
    const cleanParams = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '' && value !== 'undefined') {
        cleanParams[key] = value;
      }
    }
    const query = new URLSearchParams(cleanParams).toString();
    return request(`/responses${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  submitResponse: (responseData) =>
    request('/responses', {
      method: 'POST',
      body: responseData,
    }),

  // Alias for submitCardResponse so CardModal never fails
  submitCardResponse: (responseData) =>
    request('/responses', {
      method: 'POST',
      body: responseData,
    }),

  evaluateResponse: (id, evalData) =>
    request(`/responses/${id}/evaluation`, {
      method: 'PUT',
      body: evalData,
    }),

  // Users Directory
  getUsers: (params = {}) => {
    const cleanParams = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '' && value !== 'undefined') {
        cleanParams[key] = value;
      }
    }
    const query = new URLSearchParams(cleanParams).toString();
    return request(`/users${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  createUser: (userData) =>
    request('/users', {
      method: 'POST',
      body: userData,
    }),

  createPatient: (patientData) =>
    request('/users/patient', {
      method: 'POST',
      body: patientData,
    }),

  searchPatients: (query = '') =>
    request(`/users/patients/search?q=${encodeURIComponent(query)}`, {
      method: 'GET',
    }),

  selectPatient: (patientId) =>
    request('/users/patient/select', {
      method: 'POST',
      body: { patientId },
    }),

  updateUserRole: (id, role) =>
    request(`/users/${id}/role`, {
      method: 'PUT',
      body: { role },
    }),

  deleteUser: (id) =>
    request(`/users/${id}`, {
      method: 'DELETE',
    }),

  // Audit Logs
  getLogs: (params = {}) => {
    const cleanParams = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '' && value !== 'undefined') {
        cleanParams[key] = value;
      }
    }
    const query = new URLSearchParams(cleanParams).toString();
    return request(`/logs${query ? `?${query}` : ''}`, { method: 'GET' });
  },
};

export default { authAPI, platformAPI };
