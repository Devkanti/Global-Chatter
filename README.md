<div align="center">
  <h1>🌐 Global Chatter</h1>
  <p><strong>A premium, real-time messaging application with end-to-end encryption.</strong></p>

  <p>
    <a href="" target="_blank">
      <img src="https://img.shields.io/badge/🚀_Play_Live-Visit_Website-10b981?style=for-the-badge" alt="Live Website" />
    </a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
    <img src="https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101" alt="Socket.io" />
    <img src="https://img.shields.io/badge/WebRTC-333333?style=for-the-badge&logo=webrtc&logoColor=white" alt="WebRTC" />
  </p>
</div>

<br />

## ✨ The Vision
Global Chatter redefines browser-based communication by blending military-grade encryption with a breathtaking, modern interface. Whether you are jumping into the Global Room to meet new people or creating a private, encrypted tunnel with a friend, the experience is lightning-fast and perfectly synced across all devices.

---

## 🚀 Key Features

- **🔐 End-to-End Encryption (E2EE):** Private chats use `AES-GCM` and `RSA-OAEP` cryptography. Your messages are encrypted *before* they leave your device, meaning the server only ever sees scrambled text.
- **📞 Audio & Video Calling:** Instantly start high-quality WebRTC peer-to-peer video and audio calls directly in the browser without installing anything.
- **🎤 Voice Notes & Audio Messages:** Don't feel like typing? Record and send encrypted voice notes instantly.
- **📬 Secure OTP Authentication:** A robust, custom-built authentication system using 6-digit email OTPs to verify real users and eliminate bots.
- **🔔 Native Push Notifications:** Never miss a message. Progressive Web App (PWA) integration sends real-time push notifications straight to your phone or desktop, even when the app is closed.
- **👀 Read Receipts & Typing Indicators:** Watch your messages get delivered with WhatsApp-style Blue Ticks and see when friends are typing in real-time.
- **🔍 Instant Search Engine:** Quickly filter through thousands of chat messages with a powerful, real-time local search tool.
- **🛡️ Community Moderation & Reputation:** An automated "Reputation Score" system monitors the global chat, deducting points for toxic behavior and automatically suspending severe offenders.
- **📱 Desktop-Class PWA:** Install it directly to your iOS or Android home screen for a native app experience.

---

## 🛠️ Tech Stack & Architecture

This application is built entirely from scratch without using heavy UI libraries, prioritizing performance and deep customization.

### Frontend
- **Framework:** React 18 & Vite for instantaneous hot-module replacement and lightning-fast builds.
- **Styling:** 100% Vanilla CSS featuring advanced glassmorphism, fluid typography, and custom micro-animations. 
- **Icons:** Lucide React for crisp, lightweight iconography.
- **PWA:** Custom Service Workers configured for offline caching and background push notifications.

### Backend
- **Core:** Node.js & Express.js architecture.
- **Database:** MongoDB & Mongoose for persistent data storage (Users, Messages, Friendships).
- **Real-Time Engine:** Socket.io for bi-directional event emission (messages, typing, read receipts).
- **Security:** bcryptjs (password hashing), jsonwebtoken (JWT Auth), and Google Apps Script REST API integration to bypass standard SMTP limits.
- **Media:** Native `MediaRecorder` API for Voice Notes, WebRTC for real-time streaming.

---

## ☁️ Deployment Architecture

Global Chatter is designed for seamless deployment:
1. **Frontend Hosting:** Configured for Render Static Hosting or Vercel.
2. **Backend Server:** Node.js Web Service on Render or Heroku.
3. **Database Layer:** MongoDB Atlas for cloud persistence.
4. **Email Delivery:** Custom Google Apps Script webhook integration for highly-deliverable OTP emails.

<br />

<div align="center">
  <p><i>Crafted with passion for secure, beautiful communication.</i></p>
</div>
