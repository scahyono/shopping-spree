# Shopping Spree 🛍️

**Shopping is Free (if you budget right)**

A playful, "Retail Therapy" themed Progressive Web App (PWA) designed to make budgeting fun and shopping guilt-free. Built with **React**, **Vite**, and **Tailwind CSS**.

![Desktop View](screenshots/desktop_view.png)

## Features

### 1. The "One Truth" Header
Always know exactly what you can spend **this week**.
- **Smart Calculation**: Your "Wants" budget (derived from Income - Needs - Future) is divided by the number of Saturdays in the month.
- **Rollover Logic**: Unused budget from previous weeks automatically rolls over to the current week.
- **Details**: Click the header to see your full financial breakdown (Income, Needs, Future, Wants).

![Expanded Budget](screenshots/desktop_view_expanded.png)

### 2. Shop & Stock Flow
- **Stock Tab**: Your master inventory (Pantry/Fridge). Search for items or add new ones here.
- **Shop Tab**: Your active shopping list.
- **Action**: Moving an item from *Stock* to *Shop* marks it "To Buy". Marking it "Bought" in *Shop* triggers a confetti celebration 🎉.

### 3. Mobile First Design
Optimized for mobile use with a thumb-friendly persistent footer and responsive layout.

| Android | iPhone |
|:---:|:---:|
| ![Android](screenshots/mobile_android.png) | ![iPhone](screenshots/mobile_iphone.png) |

## Tech Stack
- **Framework**: React + Vite
- **Styling**: Tailwind CSS (v4)
- **State**: React Context (Storage Adapter Pattern)
- **Testing**: Vitest

## How to Run

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Dev Server**
   ```bash
   npm run dev
   ```

3. **Deploy**
   ```bash
   npm run deploy
   ```
   (Deploys to GitHub Pages)

## Configuration

### GitHub Pages Deployment
To deploy to GitHub Pages, you need to configure the base URL:

1. Open `vite.config.js`
2. Update the `base` property to match your repository name:
   ```javascript
   export default defineConfig({
     // ...
     base: '/your-repo-name/', // e.g. '/shopping-spree/'
     // ...
   })
   ```

### Firebase Setup (Family Sync)
Enable real-time data sync across family members using Firebase.

#### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Google Authentication** in Authentication settings
4. Create **Cloud Firestore** database

#### 2. Set Up Firestore Collections
In Firestore, create these collections:
- `whitelist`: Add documents with email addresses of family members (Document ID = email)
- `family`: Will be auto-created on first sync (stores shared data)

#### 3. Configure Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /whitelist/{email} {
      allow read: if request.auth != null;
      allow write: if false; // Admin only via Console
    }
    match /family/shared {
      allow read, write: if request.auth != null 
        && exists(/databases/$(database)/documents/whitelist/$(request.auth.token.email));
    }
  }
}
```

#### 4. Configure in App
1. Navigate to **Settings** page in the app
2. Enter your Firebase configuration (from Firebase Console → Project Settings → Web App)
3. Click **Save Configuration**
4. Click **Sign In with Google**
5. Enable **Firebase Sync** toggle

**Note**: The app works offline-first. Data is always saved to localStorage and synced to Firebase when online.
