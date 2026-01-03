# Shopping Spree 🛍️

**One weekly number. Full spending control.**

Shopping Spree is a simple PWA for managing everyday spending using a **manually set weekly budget**, a **shopping list**, and a **stock checklist**.

No bank sync.  
No categories.  
Works with cash, cards, wallets, and vouchers.

---

## How It Works

### 1. Weekly Budget (Manual by Design)
- You **set or update** one weekly budget number
- Reset, add, or subtract anytime
- Budget rolls over if unused
- A single budget for all payment methods

You control the number.  
Nothing is automated.

---

### 2. Shopping List
- Add items before shopping
- Buy only what’s listed
- Check off as you go
- Update the budget manually

---

### 3. Stock Checklist
- Track what you already have
- Add items to shopping list as needed 
- Prevents duplicate buying
- Reduces waste

---

## The Loop

1. Check **Stock**
2. Build **List**
3. Spend within **Weekly Budget**
4. Review categorization later in your bank app

---

## Why It Works

- Weekly thinking
- Manual = mindful
- Payment-agnostic
- Simple enough to stick with

> Control first. Analysis later.
![Desktop View](screenshots/desktop_view.png)

## Shop & Stock Flow
- **Stock Tab**: Your master inventory (Pantry/Fridge). Search for items or add new ones here.
- **Shop Tab**: Your active shopping list.
- **Action**: Moving an item from *Stock* to *Shop* marks it "To Buy". Marking it "Bought" in *Shop* triggers a confetti celebration 🎉.

## Mobile First Design
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
        ".write": "auth != null && root.child('whitelist').child(auth.uid).exists()"
      }
    },
    "buildInfo": {
      ".read": "true",
      ".write": "auth != null && root.child('whitelist').child(auth.uid).exists()",
      ".validate": "newData.hasChildren(['buildNumber', 'builtAt'])"
    }
  }
}
}
```

#### 4.5 Build metadata sync
The deploy script still bumps the local build number, but the app now writes build metadata to the top-level `buildInfo` node only after a signed-in, whitelisted user connects to Firebase. When the app detects that the database build number is lower than the bundled build number, it updates the remote entry to match. Reads remain open for visibility while writes are constrained to whitelisted users via the rule above.

#### 4. Sign In and Sync
1. Click **Sign In with Google** in the app header
2. Toggle **Sync** on to start syncing budget and items through Realtime Database

**Note**: The app works offline-first. Data is always saved locally and synced to Firebase when online.
