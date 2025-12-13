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
Enable real-time data sync across family members using Firebase Realtime Database. The app already ships with the production Firebase configuration baked in, so no additional app-side setup is required.

#### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Google Authentication** in Authentication settings
4. Create a **Realtime Database** (start in locked mode)

#### 2. Manage Users (White-list)
The app restricts access to a specific "family" of users using a whitelist.

1.  **User Request**: A new user signs in with Google. They will see a "Waiting List" message if not yet approved.
2.  **Auto-Queue**: Their account details (UID, email) are automatically added to the `waitingList` node in the Realtime Database.
3.  **Admin Approval**:
    *   Go to [Firebase Console](https://console.firebase.google.com/) > Realtime Database.
    *   Find the user's UID in the `waitingList` node.
    *   Create a new entry in the `whitelist` node with that **UID** as the key and `true` as the value.
    *   (Optional) Delete the entry from `waitingList`.

Example `whitelist` structure:
```json
{
  "whitelist": {
    "Wv0ExampleUid123": true,
    "AnotherUserUid456": true
  }
}
```

#### 3. Configure Security Rules
```json
{
  "rules": {
    "whitelist": {
      "$uid": {
        ".read": "auth != null",
        ".write": "false"
      }
    },
    "waitingList": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "family": {
      "shared": {
        ".read": "auth != null && root.child('whitelist').child(auth.uid).exists()",
        ".write": "auth != null && root.child('whitelist').child(auth.uid).exists()",
        "buildInfo": {
          ".read": "auth != null && root.child('whitelist').child(auth.uid).exists()",
          ".write": "auth != null && root.child('whitelist').child(auth.uid).exists()"
        }
      }
    }
  }
}
```

#### 4.5 Build metadata sync
The deploy script bumps the build number and can also write the updated build metadata into `family/shared/buildInfo` in the Realtime Database. Provide one of the following credentials before running `npm run deploy` so the write succeeds:

- `FIREBASE_SERVICE_ACCOUNT`: Inline JSON string containing the Firebase service account.
- `FIREBASE_SERVICE_ACCOUNT_PATH`: Path to a JSON file with the Firebase service account (relative paths are resolved from the project root).
- `FIREBASE_DATABASE_AUTH`: A database auth token (ID token or database secret) with permission to write to `family/shared/buildInfo`.

If none of these values are set, the deploy still runs but skips writing build metadata to the cloud.

#### 4. Sign In and Sync
1. Click **Sign In with Google** in the app header
2. Toggle **Sync** on to start syncing budget and items through Realtime Database

**Note**: The app works offline-first. Data is always saved locally and synced to Firebase when online.
