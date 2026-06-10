<div align="center">
  <h1>🌐 Global Chatter</h1>
  <p><strong>A premium, real-time messaging application with end-to-end encryption.</strong></p>
  
  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101" alt="Socket.io" />
    <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
  </p>
</div>

<br />

## ✨ Features

- **⚡ Lightning-Fast Real-Time Messaging:** Powered by Socket.io for instant message delivery without reloading.
- **🔒 End-to-End Encryption (E2EE):** Private rooms utilize military-grade `AES-GCM` and `RSA-OAEP` cryptography right in the browser. The server never sees your private messages.
- **🎨 Desktop-Class Interface:** A unified, highly responsive UI featuring sleek glassmorphism panels, dark/light modes, and dynamic slider animations.
- **🛡️ Privacy & Safety Modes:** Built-in tools to block strangers, manage friend requests, and maintain a unique community **Reputation Score** system to curb toxicity.
- **🌍 Global & Private Rooms:** Drop into the public Global Chat to meet people, or securely spin up isolated Private Rooms for secure conversations.
- **📱 Presence & Status:** Track online, offline, invisible, and "Do Not Disturb" statuses in real time.

---

## 🛠️ Tech Stack

- **Frontend:** React (Vite), Lucide Icons, Vanilla CSS (Custom Design System)
- **Backend:** Node.js, Express, Socket.io
- **Security:** Web Crypto API
- **Caching / State (Optional):** Redis (Ready for horizontal scaling)

---

## 🚀 Getting Started (Local Development)

Follow these instructions to run the application locally on your machine.

### Prerequisites
- [Node.js](https://nodejs.org/) installed (v16+)
- [Git](https://git-scm.com/) installed

### 1. Clone the repository
```bash
git clone https://github.com/Devkanti/Global-Chatter.git
cd Global-Chatter
```

### 2. Setup the Backend
Open a terminal and start the server:
```bash
cd backend
npm install
npm run start
```
*The backend will run on `http://localhost:3001`.*

### 3. Setup the Frontend
Open a new terminal window and start the React app:
```bash
cd frontend
npm install
npm run dev
```
*The frontend will run on `http://localhost:5173`. Open this URL in your browser to start chatting!*

---

## ☁️ Deployment

The application is completely secure and ready to be deployed to production.

1. **Deploy Backend:** Deploy the `backend/` folder to a service like Render, Heroku, or DigitalOcean. Set the environment variable `FRONTEND_URL` to your live website's domain to secure the CORS policy.
2. **Deploy Frontend:** Deploy the `frontend/` folder to Vercel or Netlify. Set the environment variable `VITE_BACKEND_URL` to your live backend server URL.

> **Note:** Sensitive environment configurations (`.env`) are securely ignored via `.gitignore` to prevent credential leaks.

---

## 📝 License
This project is licensed under the MIT License - feel free to use it, modify it, and learn from it.
