# 💰 SplitWise Pro — Smart Expense Splitter

A full-stack MERN application for splitting expenses among friends, roommates, and teams. Track shared costs, calculate balances in real-time, and settle up with minimum transactions — powered by AI insights.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)

---

## ✨ Features

### Core Features
- **User Authentication** — Secure JWT-based registration and login
- **Group Management** — Create groups, add/remove members by email search
- **Expense Splitting** — Equal or custom split among selected members
- **Real-Time Balances** — See who owes whom at a glance
- **Settlement Optimization** — Minimizes transactions using a greedy algorithm
- **Expense Categories** — Food, Travel, Rent, Entertainment, Utilities, Shopping, Healthcare

### AI-Powered Features (Google Gemini)
- **Smart Categorization** — Auto-categorizes expenses based on description using AI
- **Spending Insights** — AI-generated analysis of spending patterns and trends
- **Category & Member Analytics** — Interactive charts (pie + bar) powered by Chart.js

### UX & Design
- **Premium Dark Theme** with glassmorphism effects
- **Responsive Design** — Mobile, tablet, and desktop
- **Micro-Animations** — Smooth transitions and hover effects
- **Toast Notifications** — Real-time feedback on actions
- **Inter Typography** — Clean, modern Google Fonts

---

## 🏗️ Architecture

```
SmartExpenseSplitter/
├── server/                    # Express.js Backend
│   ├── config/db.js          # MongoDB connection
│   ├── middleware/auth.js    # JWT authentication
│   ├── models/
│   │   ├── User.js           # User schema + bcrypt
│   │   ├── Group.js          # Group schema
│   │   └── Expense.js        # Expense + splits schema
│   ├── routes/
│   │   ├── auth.js           # Register, login, search
│   │   ├── groups.js         # Group CRUD
│   │   ├── expenses.js       # Expense CRUD + splitting
│   │   ├── balances.js       # Balance & settlement calc
│   │   └── ai.js             # AI categorization & insights
│   ├── utils/
│   │   ├── splitCalculator.js    # Equal & custom split logic
│   │   └── settlementEngine.js   # Min-transaction algorithm
│   └── server.js             # Express app entry point
│
├── client/                    # React + Vite Frontend
│   ├── src/
│   │   ├── context/AuthContext.jsx
│   │   ├── components/Navbar.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── CreateGroup.jsx
│   │   │   ├── GroupDetail.jsx
│   │   │   ├── AddExpense.jsx
│   │   │   └── Insights.jsx
│   │   ├── utils/api.js
│   │   ├── App.jsx
│   │   └── index.css          # Complete design system
│   └── index.html
└── README.md
```

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (free tier)
- Google Gemini API key (free at [aistudio.google.com](https://aistudio.google.com/app/apikey))

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/SmartExpenseSplitter.git
cd SmartExpenseSplitter
```

### 2. Backend Setup
```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory:
```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/expense-splitter?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
CLIENT_URL=http://localhost:5173
```

Start the server:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

---

## 🧠 Technical Decisions & Trade-offs

| Decision | Rationale |
|----------|-----------|
| **JWT Authentication** | Stateless, scalable, works well with REST APIs |
| **MongoDB Atlas** | Flexible schema for groups with variable members, free tier available |
| **Greedy Settlement Algorithm** | O(n log n) complexity, minimizes transactions efficiently |
| **Vite + React** | Lightning-fast HMR, modern build tooling |
| **Google Gemini API** | Free tier with generous limits, good categorization accuracy |
| **Keyword Fallback** | AI fails gracefully — keyword matching when API key is missing |
| **CSS Custom Properties** | Complete design system without framework overhead |
| **Axios Interceptors** | Automatic token injection and 401 redirect handling |

### Settlement Algorithm
Uses a greedy min-transaction approach:
1. Calculate net balance for each member
2. Separate into debtors (negative) and creditors (positive)
3. Sort by amount descending
4. Match largest debtor with largest creditor, settle minimum
5. Repeat until all balanced

This produces near-optimal results with O(n log n) time complexity.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login & get JWT |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/users/search` | Search users by email |
| POST | `/api/groups` | Create group |
| GET | `/api/groups` | List user's groups |
| GET | `/api/groups/:id` | Get group details |
| PUT | `/api/groups/:id` | Update group |
| DELETE | `/api/groups/:id` | Delete group |
| POST | `/api/expenses` | Create expense |
| GET | `/api/expenses/group/:id` | List group expenses |
| PUT | `/api/expenses/:id` | Update expense |
| DELETE | `/api/expenses/:id` | Delete expense |
| GET | `/api/balances/:groupId` | Get net balances |
| GET | `/api/balances/:groupId/settlements` | Get settlement plan |
| POST | `/api/ai/categorize` | AI categorize expense |
| POST | `/api/ai/insights/:groupId` | AI spending insights |

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, React Router v6, Axios, Chart.js, React-Toastify, React Icons
- **Backend:** Node.js, Express.js, Mongoose, JWT, bcryptjs, Helmet, Express-Validator
- **Database:** MongoDB Atlas
- **AI:** Google Gemini API
- **Deployment:** Vercel (frontend) + Render (backend)

---

## 📄 License

MIT
