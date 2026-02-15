# Jersivo - Football Jersey E-Commerce Store

Dynamic football jersey e-commerce system with admin panel.

## Quick Start

### 1. Install Dependencies
```bash
npm install
2. Start Server
npm start
Server runs on: http://localhost:3000
3. Access
Store: http://localhost:3000
Admin: http://localhost:3000/admin
4. Admin Login
Username: sam@jersivo007
Password: stg@jer@2009*#
Deploy to Render
Step 1: Push to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR-USERNAME/jersivo-store.git
git push -u origin main
Step 2: Deploy on Render
Go to https://render.com
Sign up with GitHub
New + → Web Service
Connect your repo
Configure:
Build: npm install
Start: npm start
Click "Create Web Service"
Step 3: Add Persistent Disk (Recommended)
For database persistence:
Render Dashboard → Your Service → Disks
Add Disk: jersivo-data, Mount: /var/data, Size: 1GB
Update database/init.js line 4:
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/var/data/jersivo.db' 
    : path.join(__dirname, 'jersivo.db');
    Push changes to GitHub (Render auto-deploys)
    Features
    Dynamic product catalogue
    Search and filters
    Shopping cart
    Order checkout with Google Form
    Admin panel (add/edit/delete products)
    Mobile responsive
    Tech Stack
    Node.js + Express
    SQLite database
    Vanilla HTML/CSS/JavaScript
    Support
    Instagram: @shop.jersivo
    Built with ❤️ for Jersivo