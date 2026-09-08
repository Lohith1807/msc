# MindLab — Mental Health & Well-being Platform (MERN Stack)

A production-ready implementation of the MindLab authentication system and user space, built with MongoDB, Express, React, and Node.js.

![MindLab Welcome & Login](client/public/assets/getstarted.png)

---

## 🌿 Architecture Overview

- **Frontend (`client/`)**:
  - Built with **React 18** and **Vite**
  - Styled with **Vanilla CSS & CSS variables** matching `mindlab.html` design tokens and typography (Google Font *Quicksand*)
  - **Responsive Design**:
    - **Desktop (≥901px)**: Unified split-panel card (`AuthCard`) with full-bleed peaceful illustration on the left and dynamic auth form on the right
    - **Tablet (421px–900px)**: Refined mobile phone mockup frame
    - **Mobile (≤420px)**: Full-viewport mobile layout with zero horizontal overflow
  - **In-Memory JWT Auth**: Secure token management in `AuthContext` with session persistence
  - **Form Validation**: Inline feedback and real-time field status (no browser `alert()` popups)
  - **Screens**:
    - `WelcomeScreen`: Hero illustration, logo, tagline, "Get Started" call-to-action
    - `LoginScreen`: Email/password inputs, show/hide password toggle, forgot password link, social divider, sign up switch
    - `SignupScreen`: Name, email, password, and confirm password with password match validation
    - `ForgotPasswordScreen`: Email-based reset link dispatcher with generic protection against user enumeration
    - `ResetPasswordScreen`: Token-based new password setup
    - `Dashboard`: Authenticated sanctuary with emotional check-in card and secure sign out

- **Backend (`server/`)**:
  - Built with **Node.js** and **Express** (ES Modules)
  - **MongoDB / Mongoose**:
    - `User` schema: `name`, `email` (unique, lowercase, normalized), `passwordHash` (bcrypt salt 12), `resetPasswordToken` (SHA-256 hashed), `resetPasswordExpires`, timestamps
    - Automatic connection to `process.env.MONGO_URI` (or MongoDB Atlas) with an automated development fallback using `mongodb-memory-server` for zero-configuration local runs
  - **Security**:
    - `bcryptjs` for salted hashing
    - `jsonwebtoken` with configurable expiration (`7d`)
    - `express-rate-limit` protecting auth endpoints against brute-force attacks
    - `express-validator` for input sanitization and validation schemas
    - Centralized error-handling middleware

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+) & npm

### 1. Install Dependencies
```bash
# Install dependencies for both client and server
npm run install:all
```

### 2. Run the Full Stack
```bash
# Run both backend server (port 5000) and frontend client (port 5173) concurrently
npm run dev
```

The application will be accessible at:
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
- **Static Prototype Reference**: [http://localhost:5173/mindlab.html](file:///c:/Users/lohit/Downloads/MSC/mindlab.html)

---

## 📡 API Endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user & return JWT token | Public |
| `POST` | `/api/auth/login` | Authenticate user & return JWT token | Public (Rate-limited) |
| `POST` | `/api/auth/forgot-password` | Generate reset token & return generic confirmation | Public (Rate-limited) |
| `POST` | `/api/auth/reset-password/:token` | Validate token & update password | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Private (Bearer JWT) |
| `GET` | `/api/health` | Service health status | Public |

---

## 🧪 Testing Backend Auth

To run the automated backend test suite:
```bash
node server/src/test_auth.js
```
