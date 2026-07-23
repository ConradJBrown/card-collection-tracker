# card-collection-tracker

A personal web app for tracking your Yu-Gi-Oh! TCG collection.  
Built with **React + TypeScript + Vite**, this project allows you to search cards from the [YGOPRODeck API](https://ygoprodeck.com/api-guide/), add them to your collection, and persist them locally.

> ⚡ Phase 2 foundation: local-first app with optional Supabase-backed authentication and cloud sync.  
> Phase 1 goal — Search → Add → View → Remove cards.

---

## 🌟 Features (MVP)

- 🔍 **Search Yu-Gi-Oh! cards** via YGOPRODeck API  
- ➕ **Add cards** to your collection  
- 💾 **Local persistence** using IndexedDB (via Localforage)  
- 🧠 **State management** powered by Zustand  
- 📱 Responsive grid-based UI with TailwindCSS  
- ⚙️ Fast, modern build with Vite  

---

## 🏗️ Tech Stack

| Layer | Tech |
|--------|------|
| **Frontend** | React 18 + TypeScript |
| **Build Tool** | Vite |
| **State Management** | Zustand |
| **Local Storage** | Dexie + IndexedDB |
| **Styling** | TailwindCSS |
| **API** | YGOPRODeck REST API |
| **Auth / Sync** | Supabase Auth + Postgres (optional) |
| **Package Manager** | npm or pnpm |

---

## 🚀 Getting Started

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/<your-username>/yugioh-collection-tracker.git
cd yugioh-collection-tracker
````

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Optional: Configure Supabase for Phase 2

Copy the example environment file and fill in your Supabase values:

```bash
cp .env.example .env
```

Required variables:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Optional variables:

```bash
VITE_DEPLOYMENT_MODE=hosted # or self-hosted
VITE_SUPABASE_REDIRECT_URL=http://localhost:5173
```

Apply the SQL in `/supabase/schema.sql` to your Supabase project before signing in.

### 4️⃣ Run the Development Server

```bash
npm run dev
```

Then open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 🧰 Project Structure

```
src/
├─ components/
│  ├─ CardSearch.tsx        # Search UI and results grid
│  ├─ CollectionList.tsx    # Displays saved cards
│  └─ (more UI components)
├─ store/
│  └─ collectionStore.ts    # Zustand store for collection filters/sorting
├─ services/
│  ├─ authProvider.ts       # Auth abstraction with Supabase implementation
│  ├─ cloudCollection.ts    # Cloud collection sync service
│  ├─ db.ts                 # Local Dexie collection cache
│  └─ yugiohApi.ts          # API client for YGOPRODeck
├─ types.ts                 # Shared interfaces
└─ App.tsx                  # Root app + navigation
```

---

## 🧩 Example Features in MVP

### 🔍 Search Cards

* Input text to search by card name (`fname` query on YGOPRODeck API).
* Displays card images and names.
* “Add to Collection” button stores it locally.

### 📚 View Collection

* Displays all owned cards with quantity and condition.
* “Remove” button deletes from local store.
* Data is saved persistently across sessions.

---

## 🧠 Roadmap

### ✅ Phase 1 — MVP

* [x] Project scaffolding (React + TS + Tailwind + Zustand)
* [x] Card search using API
* [x] Local collection store
* [x] Collection view with add/remove
* [x] Persistence via IndexedDB
* [x] Responsive design polish

### 🔜 Phase 2 — Cloud & Accounts

* [x] Add a Supabase-ready authentication and sync layer
* [x] Support multiple devices per user through cloud sync
* [x] Preserve guest collections for post-login import
* [ ] Add organization/admin workflows for company installs
* [ ] Import/export JSON data

### 🔮 Future Enhancements

* [ ] PWA support for offline install
* [ ] Price tracking (TCGPlayer / YGOPRODeck price data)
* [ ] Barcode/QR scanning for card input
* [ ] Deck builder / wishlist
* [ ] Multi-TCG support (Pokémon, MTG, One Piece)

---

## 🧪 Development Workflow

1. **Branch Strategy**

   * `main` → stable builds
   * `dev` → feature development

2. **Typical workflow**

   ```bash
   git checkout -b feature/card-filtering
   # make changes
   git commit -m "Add filtering to collection view"
   git push origin feature/card-filtering
   ```

3. **Open a Pull Request** into `dev`
   Review → Merge → Deploy

---

## 🧰 Commands

| Command           | Description                |
| ----------------- | -------------------------- |
| `npm run dev`     | Run development server     |
| `npm run build`   | Build for production       |
| `npm run preview` | Preview built app locally  |
| `npm run lint`    | Lint code (requires ESLint config) |

---

## 🔐 Phase 2 Authentication Notes

- Without Supabase env vars, the app stays in **local-only mode**.
- With Supabase configured, users can:
  - create an account
  - sign in and sign out
  - request a password reset
  - sync their collection across devices
  - import their pre-auth local collection into their account
- The UI talks to an auth abstraction so a future self-hosted company deployment can swap identity providers with limited app-side changes.

---

## 🧾 API Reference

**YGOPRODeck API**

* Base URL: `https://db.ygoprodeck.com/api/v7/cardinfo.php`
* Example query:

  ```
  GET /api/v7/cardinfo.php?fname=Dark Magician
  ```

Response includes:

* Card name, description, ATK/DEF, level, type, attribute
* Image URLs
* Card set and rarity data

---

## 🌐 Deployment

You can deploy quickly via:

* [Vercel](https://vercel.com/) → automatic with `npm run build`
* [Netlify](https://netlify.com/)
* [GitHub Pages](https://pages.github.com/) using `vite-plugin-gh-pages`

### PM2 (home network / self-hosted)

For internal hosting on your home network, this repo includes a PM2 workflow that runs the built app with `vite preview` bound to all interfaces.

1. Install PM2 (once):

   ```bash
   npm install -g pm2
   ```

2. Build and start with PM2:

   ```bash
   npm run pm2:rebuild
   npm run pm2:start
   ```

3. Open from any device on your LAN:

   ```text
   http://<your-host-machine-ip>:4173
   ```

Useful commands:

```bash
npm run pm2:restart
npm run pm2:rebuild
npm run pm2:reload
npm run pm2:stop
npm run pm2:delete
pm2 logs card-collection-tracker
```

> ⚠️ Security note: `vite preview` is intended for internal/testing use. It does not provide production hardening (for example rate limiting, HTTPS enforcement, or hardened error handling), and this app does not include LAN access authentication. Binding to `0.0.0.0` exposes the app on all host interfaces, so keep this behind your home network/firewall and do not use it as an internet-facing production server. For longer-term self-hosting, place it behind a reverse proxy such as Nginx.

---

## 🤝 Contributing

Contributions, suggestions, and feature ideas are welcome!
Feel free to:

* Open an Issue for bugs or feature requests
* Create Pull Requests for enhancements
* Discuss roadmap items in the GitHub Project board

---

## 📄 License

This project is open source under the **MIT License**.
See the [LICENSE](./LICENSE) file for details.

---

## 🧙‍♂️ Author

**Conrad Brown**
Software Developer & TCG Enthusiast
[GitHub Profile](https://github.com/ConradJBrown)

---

> *“In every duel, the cards tell a story — this app just helps you keep track of it.”*
