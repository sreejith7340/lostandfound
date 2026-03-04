# 🎓 Campus Lost & Found System

A complete full-stack web application for managing lost and found items on campus.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Bootstrap 5, Vanilla JS |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (JSON Web Tokens) |
| File Upload | Multer |

---

## 📁 Project Structure

```
lost-found-system/
├── server.js              ← Main Express server
├── package.json
├── .env                   ← Environment variables
├── seed.js                ← Admin seed script
│
├── config/
│   └── db.js              ← MongoDB connection
│
├── models/
│   ├── User.js
│   ├── LostItem.js
│   ├── FoundItem.js
│   └── Claim.js
│
├── controllers/
│   ├── authController.js
│   ├── itemController.js
│   └── adminController.js
│
├── routes/
│   ├── authRoutes.js
│   ├── itemRoutes.js
│   └── adminRoutes.js
│
├── middleware/
│   └── authMiddleware.js  ← JWT Guard
│
├── public/
│   ├── css/style.css
│   ├── js/search.js
│   ├── js/admin.js
│   └── uploads/           ← Uploaded images
│
├── views/
│   ├── index.html         ← Landing page
│   ├── search.html
│   ├── reportLost.html
│   └── reportFound.html
│
└── admin/
    ├── login.html
    └── dashboard.html
```

---

## ⚙️ Installation & Setup

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v16+
- [MongoDB](https://www.mongodb.com/try/download/community) (local) or a MongoDB Atlas connection string

### 2. Install Dependencies

```bash
cd lost-found-system
npm install
```

### 3. Configure Environment

Edit `.env` file:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/campus_lost_found
JWT_SECRET=campus_lost_found_secret_key_2024
NODE_ENV=development
```

> For MongoDB Atlas, replace `MONGODB_URI` with your Atlas connection string.

### 4. Seed Admin User

```bash
node seed.js
```

This creates the default admin account:
- **Email:** admin@campus.com
- **Password:** admin123

### 5. Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

### 6. Open in Browser

| Page | URL |
|------|-----|
| 🏠 Landing Page | http://localhost:5000 |
| 🔍 Search Items | http://localhost:5000/search |
| 📝 Report Lost | http://localhost:5000/report-lost |
| 📦 Report Found | http://localhost:5000/report-found |
| 🔒 Admin Login | http://localhost:5000/admin |
| 📊 Dashboard | http://localhost:5000/admin/dashboard |

---

## 🔐 API Endpoints

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login (user/admin) |
| GET | `/api/auth/me` | Get current user |

### Items (Public)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/items/search` | Search all items |
| POST | `/api/items/lost` | Report lost item |
| GET | `/api/items/lost` | Get approved lost items |
| GET | `/api/items/lost/:id` | Get single lost item |
| POST | `/api/items/found` | Report found item |
| GET | `/api/items/found` | Get approved found items |
| GET | `/api/items/found/:id` | Get single found item |
| POST | `/api/items/claim` | Submit claim request |

### Admin (JWT Required)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/stats` | Dashboard statistics |
| GET | `/api/admin/items` | All items (admin view) |
| PUT | `/api/admin/items/:type/:id/status` | Approve/reject item |
| PUT | `/api/admin/items/:type/:id` | Edit item |
| DELETE | `/api/admin/items/:type/:id` | Delete item |
| GET | `/api/admin/claims` | All claims |
| PUT | `/api/admin/claims/:id/status` | Approve/reject claim |
| GET | `/api/admin/users` | All users |
| PUT | `/api/admin/users/:id/block` | Block/unblock user |
| DELETE | `/api/admin/users/:id` | Delete user |
| GET | `/api/admin/reporters` | Item reporters list |

---

## 📦 Dependencies

```json
{
  "express": "^4.18.2",
  "mongoose": "^7.6.3",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^2.4.3",
  "multer": "^1.4.5-lts.1",
  "dotenv": "^16.3.1",
  "cors": "^2.8.5"
}
```

---

## 🎨 Features

### Users
- ✅ Report lost items with image upload
- ✅ Report found items with image upload
- ✅ Search & filter items (by name, category, type)
- ✅ View item details
- ✅ Submit claim requests with proof

### Admin Dashboard
- ✅ Live statistics (total, lost, found, claims)
- ✅ Approve / Reject items
- ✅ Approve / Reject claim requests
- ✅ Edit & delete items
- ✅ Block / delete users
- ✅ View all reporters
- ✅ Notification center
- ✅ System action logs
- ✅ Items by status & category charts

---

## 📝 License

MIT — Free to use for educational purposes.
