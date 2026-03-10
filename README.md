# 🏠 Ghor Bari - Property Rental & Listing Platform

<div align="center">

A comprehensive full-stack web application for buying, renting, and managing property listings in Bangladesh with real-time chat functionality, AI-powered property descriptions, and advanced admin dashboard.

**Live Website:** https://ghor-bari-2c93a.web.app/

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)

[Features](#-features) • [Tech Stack](#-tech-stack) • [Installation](#-installation) • [Configuration](#-configuration) • [API Docs](#-api-documentation) • [Architecture](#-project-architecture)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [API Documentation](#-api-documentation)
- [Project Architecture](#-project-architecture)
- [Database Schema](#-database-schema)
- [Real-Time Features](#-real-time-features)
- [Security Features](#-security-features)
- [Performance Optimization](#-performance-optimization)
- [Deployment Guide](#-deployment-guide)
- [Troubleshooting](#-troubleshooting-guide)
- [Contributing](#-contributing)
- [License](#-license)
- [Support](#-support)

---

## 🎯 Overview

**Ghor Bari** (ঘর বাড়ি - "Home" in Bengali) is a modern, feature-rich property platform specifically designed for the Bangladesh real estate market. It connects property owners with potential buyers and renters, facilitating seamless property discovery, communication, and transactions.

### Key Highlights

- 🌐 **Geo-Location Based Search**: Find properties by Division, District, and Upazila
- 💬 **Real-Time Chat**: Instant messaging powered by Socket.io
- 🤖 **AI Integration**: Groq API for intelligent property descriptions
- 🧠 **Ghor Bari AI Assistant**: Hybrid property matching from platform listings with advisory responses
- ✅ **Verification System**: NID-based user verification for trust
- 📧 **Queued Email Notifications**: Background delivery for deal and application lifecycle updates
- 📊 **Advanced Analytics**: Dashboard with detailed insights
- 🔒 **Enterprise Security**: Secure authentication and data protection
- 📱 **Mobile Responsive**: Fully optimized for all devices
- ⚡ **High Performance**: Optimized caching and database queries

---

## ✨ Features

### 👤 User Features

#### 🔍 **Advanced Property Search**

- Filter by property type (flat/building)
- Filter by listing type (rent/sale)
- Multi-level location filtering (Division → District → Upazila → Street)
- Price range and area filtering
- Sorting options (newest, price, area, popularity)
- Advanced filters (amenities, rooms, bathrooms)

#### 💬 **Real-Time Chat**

- Instant messaging with property owners
- Typing indicators and read receipts
- Chat history and conversation management
- Image sharing in messages
- Offline message queuing

#### 🔐 **Secure Authentication**

- Firebase-based secure authentication
- Email/password registration and login
- Social login (Google, Facebook)
- Password reset and recovery
- Two-factor authentication support

#### ⭐ **Property Comparison**

- Compare multiple properties side-by-side
- Feature comparison matrix
- Price comparison and analysis

#### 📋 **Detailed Property Listings**

- Professional property photos with gallery
- AI-generated property descriptions
- AI chat-assisted property discovery with direct property navigation
- Interactive maps showing location
- Comprehensive property specifications
- User reviews and ratings

#### ❤️ **Wishlist Management**

- Save favorite properties
- Personal notes on properties
- Wishlist organization and sharing

#### ⭐ **Rating & Reviews System**

- Rate property owners
- Submit property reviews
- Trust indicators and reputation

### 🏢 Property Management

#### 📝 **Property Creation**

- Intuitive property creation wizard
- Support for flat and building properties
- Bulk image upload with drag-and-drop
- AI-powered description generation
- Automatic property appraisal

#### ✏️ **Property Management**

- Edit property details anytime
- Image management and rearrangement
- Publish/unpublish listings
- Property performance tracking

#### 📊 **Application Tracking**

- View and manage buyer/renter applications
- Application status tracking
- Counter offers, revised offers, and deal completion/cancellation workflow
- Direct communication with applicants

#### 📧 **Notification Delivery**

- Queued email jobs for application and deal events
- Retry handling for failed deliveries
- Background processing through cron or secured internal endpoint

### 🛠️ Admin Features

#### 👥 **Comprehensive User Management**

- View all users with detailed profiles
- User role assignment and management
- User activity tracking
- Advanced search and filtering
- Bulk user operations

#### 🏠 **Property Moderation System**

- Review pending property listings
- Approve/reject with feedback
- Edit and remove listings
- Bulk moderation actions

#### ✅ **Verification System**

- NID document submission workflow
- User verification status tracking
- Verification auditing

#### 📊 **Analytics & Dashboard**

- Real-time system statistics
- User growth analytics
- Revenue and performance metrics
- System health monitoring

---

## 🛠️ Tech Stack

### Frontend Technologies

| Technology           | Purpose                      | Version |
| -------------------- | ---------------------------- | ------- |
| **React**            | Component-based UI framework | 18.x    |
| **Vite**             | Ultra-fast build tool        | 4.x     |
| **TailwindCSS**      | Utility-first CSS framework  | 3.x     |
| **Axios**            | HTTP client library          | 1.7.7   |
| **React Router**     | Client-side routing          | 6.x     |
| **Firebase SDK**     | Authentication & services    | 10.x    |
| **Socket.io Client** | Real-time communication      | 4.8.1   |

### Backend Technologies

| Technology             | Purpose                 | Version |
| ---------------------- | ----------------------- | ------- |
| **Node.js**            | JavaScript runtime      | 18+ LTS |
| **Express.js**         | Web framework           | 5.2.1   |
| **MongoDB**            | NoSQL database          | 6.x+    |
| **Mongoose**           | MongoDB ODM             | 9.0.1   |
| **Firebase Admin SDK** | Server-side Firebase    | 13.7.0  |
| **Socket.io**          | Real-time communication | 4.8.1   |
| **Node-cron**          | Task scheduling         | 4.2.1   |
| **Nodemailer**         | Email service           | 8.0.1   |
| **Firebase Admin SDK** | Server-side Firebase    | 13.7.0  |

### External Services

| Service             | Purpose               |
| ------------------- | --------------------- |
| **Groq API**        | AI content generation |
| **Firebase Auth**   | User authentication   |
| **ImgBB**           | Image hosting         |
| **React Leaflet / Leaflet** | Interactive map rendering     |
| **Nodemailer**      | Email notifications   |

---

## 📁 Project Structure

```
GHOR_BARI/
├── 📁 backend/
│   ├── 📁 src/
│   │   ├── 📄 app.js
│   │   ├── 📁 config/
│   │   │   ├── 📄 db.js
│   │   │   ├── 📄 environment.js [NEW]
│   │   │   ├── 📄 constants.js [NEW]
│   │   │   ├── 📄 firebase.js
│   │   │   └── 📄 socket.js
│   │   ├── 📁 controllers/
│   │   ├── 📁 models/
│   │   ├── 📁 routes/
│   │   ├── 📁 middleware/ [REFACTORED]
│   │   ├── 📁 services/
│   │   ├── 📁 events/
│   │   ├── 📁 jobs/
│   │   └── 📁 utils/ [NEW]
│   ├── 📄 server.js [UPDATED]
│   └── 📄 package.json
│
├── 📁 client/
│   ├── 📁 src/
│   │   ├── 📄 main.jsx
│   │   ├── 📄 Router.jsx
│   │   ├── 📁 Components/
│   │   ├── 📁 Pages/
│   │   ├── 📁 Hooks/
│   │   ├── 📁 context/
│   │   ├── 📁 Firebase/
│   │   ├── 📁 Layouts/
│   │   ├── 📁 PrivateRoute/
│   │   └── 📁 Utilities/
│   ├── 📁 public/
│   ├── 📄 index.html
│   ├── 📄 vite.config.js
│   └── 📄 package.json
│
├── 📄 README.md [UPDATED]
├── 📄 BACKEND_REFACTORING.md [NEW]
├── 📄 BACKEND_DEPLOYMENT_GUIDE.md [NEW]
└── 📄 LICENSE
```

---

## 📦 Installation

### Prerequisites

- **Node.js** v18+ ([Download](https://nodejs.org/))
- **npm** v9+ (comes with Node.js)
- **MongoDB** (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cloud)
- **Firebase Project** ([Create here](https://console.firebase.google.com))
- **Git** for version control
- **VS Code** (or your preferred editor)

### Step 1: Clone Repository

```bash
git clone https://github.com/khandakeraliariyan/GHOR_BARI.git
cd GHOR_BARI
```

### Step 2: Backend Setup

```bash
cd backend
npm install
# Create .env file with required variables
```

### Step 3: Frontend Setup

```bash
cd client
npm install
# Create .env file with Firebase config
```

---

## ⚙️ Configuration

### Backend .env

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/ghorbari

EMAIL_PROVIDER=emailjs

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_app_password
EMAIL_FROM=GhorBari <no-reply@example.com>

CLIENT_URL=http://localhost:5173

EMAILJS_SERVICE_ID=your_emailjs_service_id
EMAILJS_TEMPLATE_ID=your_emailjs_template_id
EMAILJS_PUBLIC_KEY=your_emailjs_public_key
EMAILJS_PRIVATE_KEY=your_emailjs_private_key

GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key

ENABLE_EMAIL_JOB_CRON=true
INTERNAL_CRON_SECRET=your-internal-secret
EMAIL_JOB_BATCH_SIZE=10
```

Use your deployed frontend URL in `CLIENT_URL` for production.

### Frontend .env

```env
VITE_apiKey=your_firebase_api_key
VITE_authDomain=your-project.firebaseapp.com
VITE_projectId=your_project_id
VITE_storageBucket=your-project.firebasestorage.app
VITE_messagingSenderId=your_sender_id
VITE_appId=your_app_id

VITE_IMGBB_KEY=your_imgbb_key
VITE_API_URL=http://localhost:5000
```

Example production API URL:

```env
VITE_API_URL=https://your-backend-service.onrender.com
```

Note: the current frontend Firebase config uses the lowercase `VITE_apiKey`-style keys shown above.

---

## 🚀 Running the Application

### Development Mode

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

**Terminal 2 - Frontend:**

```bash
cd client
npm run dev
# Client runs on http://localhost:5173
```

### Production Build

```bash
# Frontend
cd client
npm run build
npm run preview

# Backend uses PM2 or similar process manager
```

### Available Scripts

**Backend:**

- `npm start` - Run server
- `npm run dev` - Development with watch mode
- `npm run lint` - Check code quality
- `npm run lint:fix` - Auto-fix issues
- `npm run format` - Check formatting
- `npm run format:write` - Auto-format

**Frontend:**

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run preview` - Preview build
- `npm run lint` - Check code quality

---

## 📚 API Documentation

### Base URL

- Development: `http://localhost:5000/api`
- Production: (TBD)

### User Endpoints

**Register User**

```http
POST /api/users/register-user
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe",
  "phone": "01712345678",
  "role": "property_seeker"
}
```

**Get User Profile**

```http
GET /api/users/user-profile
Authorization: Bearer <firebase_token>
```

### Property Endpoints

**List Properties**

```http
GET /api/properties?page=1&limit=10&type=flat&listingType=rent
```

**Featured Properties**

```http
GET /featured-properties
```

**Create Property**

```http
POST /api/properties
Authorization: Bearer <firebase_token>
Content-Type: application/json

{
  "title": "Beautiful Apartment",
  "listingType": "rent",
  "propertyType": "flat",
  "price": 25000,
  "areaSqFt": 1200,
  "address": {...},
  "location": {...},
  "images": [...],
  "amenities": [...]
}
```

### AI Endpoints

**Send Message To Ghor Bari AI**

```http
POST /api/ai/send-message
Authorization: Bearer <firebase_token>
Content-Type: application/json

{
  "message": "Find me a flat in Gazipur under 30000"
}
```

Response includes normalized text plus optional `matchedProperties` used by the chat UI to render clickable property cards.

**Generate Property Description**

```http
POST /api/ai/generate-property-description
Authorization: Bearer <firebase_token>
```

**Estimate Property Price**

```http
POST /api/ai/estimate-property-price
Authorization: Bearer <firebase_token>
```

### Chat Endpoints

**Get Conversations**

```http
GET /api/chat/conversations
Authorization: Bearer <firebase_token>
```

**Send Message**

```http
POST /api/chat/:conversationId/messages
Authorization: Bearer <firebase_token>

{
  "text": "I'm interested"
}
```

### Admin Endpoints

**Get Properties**

```http
GET /api/admin/properties?status=pending
Authorization: Bearer <admin_token>
```

**Approve Property**

```http
PUT /api/admin/properties/:id/approve
Authorization: Bearer <admin_token>
```

### Public/Internal Utility Endpoints

**Public Stats**

```http
GET /public/stats
```

**Process Queued Email Jobs**

```http
POST /internal/process-email-jobs
x-internal-cron-secret: <INTERNAL_CRON_SECRET>
```

---

## 🏗️ Project Architecture

### MVC Pattern

```
Routes → Controllers → Services → Models → Database
   ↓        ↓            ↓
Middleware → Business Logic → Data Access Layer
```

### Component Structure

```
Frontend
├── Pages (Route components)
├── Components (Reusable UI)
├── Hooks (Logic encapsulation)
├── Context (State management)
└── Utilities (Helpers)
```

---

## 📊 Database Collections

### Users

- Email, name, phone, profile image
- Role (admin, owner, seeker)
- NID verification status
- Rating and review data
- Timestamps

### Properties

- Title, description, images
- Price, area, type, listing type
- Location (address + coordinates)
- Owner information
- Status and appraisal data
- Timestamps

### Chat

- Conversation ID, participants
- Message threads
- Read status, timestamps
- Attachment support

### Email Jobs

- User email and subject
- HTML content
- Status (pending, sent, failed)
- Retry information
- Dedupe key and notification read state

---

## 💬 Real-Time Features

### Socket.io Events

**Client → Server:**

- `chat:join`: Join a conversation room
- `chat:leave`: Leave a conversation room
- `message:send`: Send a message
- `typing:start`: Start typing indicator
- `typing:stop`: Stop typing indicator
- `message:markRead`: Mark conversation messages as read
- `users:getOnline`: Request online users list

**Server → Client:**

- `chat:joined`: Room join acknowledgement
- `message:received`: New message broadcast
- `typing:active`: Typing state updates
- `message:read`: Read receipt update
- `users:online`: Connected users list

### Background Jobs

- `emailJobCron`: Processes queued notification emails on a schedule
- `nidVerificationCron`: Runs pending NID verification processing

---

## 🔒 Security Features

- **Firebase Authentication**: Secure login/signup
- **Token Verification**: JWT validation on protected routes
- **Role-Based Access**: Admin/Owner/Seeker permissions
- **Password Hashing**: Bcryptjs encryption
- **CORS Protection**: Configured origins
- **Input Validation**: Data sanitization
- **Error Handling**: Safe error messages
- **Environment Variables**: Sensitive data in .env

---

## ⚡ Performance Optimization

- **Code Splitting**: Route-based bundles
- **Image Optimization**: Lazy loading
- **Database Indexing**: Optimized queries
- **Caching Strategy**: Smart cache headers
- **Compression**: Gzip responses
- **Pagination**: Limited result sets

---

## 🚀 Deployment Guide

### Frontend (Firebase Hosting)

```bash
npm run build
firebase deploy
```

### Backend (Render)

```bash
# Connect the repository in Render
# Set environment variables in the Render dashboard
# Deploy the web service
```

### Database (MongoDB Atlas)

1. Create cluster on Atlas
2. Configure IP whitelist
3. Get connection string
4. Add to backend .env

---

## 🆘 Troubleshooting

### Port Already in Use

```bash
lsof -i :5000  # Find process
kill -9 <PID>   # Kill process
# Or change PORT in .env
```

### MongoDB Connection Failed

- Verify connection string
- Check database credentials
- Whitelist your IP in MongoDB Atlas
- Ensure MongoDB is running locally

### Firebase Auth Error

- Verify service account JSON
- Check FIREBASE_PROJECT_ID
- Ensure Authentication is enabled
- Check Firebase credentials format

### Module Not Found

```bash
rm -rf node_modules package-lock.json
npm install
```

### Socket.io Connection Failed

- Verify backend is running
- Check ENABLE_SOCKET_IO=true
- Verify CORS is configured
- Check frontend Socket.io URL

---

## 🤝 Contributing

### Guidelines

- Use meaningful branch names: `feature/feature-name`
- Write clear commit messages
- Follow code style (ESLint/Prettier)
- Test your changes
- Create detailed pull requests

### Code Style

- Use Prettier for formatting
- Follow ESLint rules
- Write JSDoc comments
- Use meaningful variable names

### Commit Format

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Code style changes
refactor: Refactor code
test: Add tests
chore: Maintenance
```

---

## 📄 License

This project is licensed under the ISC License. See [LICENSE](./LICENSE) for details.

---

## 📞 Support

- **Documentation**: Read [BACKEND_REFACTORING.md](./backend/BACKEND_REFACTORING.md)
- **Issues**: [GitHub Issues](https://github.com/khandakeraliariyan/GHOR_BARI/issues)
- **Email**: [Contact Developer]

### Reporting Bugs

1. Check if bug exists in issues
2. Create new issue with:
   - Clear title
   - Detailed description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable

### Feature Requests

1. Check if feature exists
2. Create issue with:
   - Clear title
   - Detailed description
   - Use cases and benefits
   - Possible implementation

---

<div align="center">

### Built with ❤️ for Bangladesh Real Estate

[⬆ back to top](#-ghor-bari---property-rental--listing-platform)
