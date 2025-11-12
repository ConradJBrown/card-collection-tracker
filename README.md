# card-collection-tracker

* project overview
* tech stack
* setup instructions
* development workflow
* roadmap checklist
* future features
* contribution & license info

---

````markdown
# 🧩 Yu-Gi-Oh! Collection Tracker

A personal web app for tracking your Yu-Gi-Oh! TCG collection.  
Built with **React + TypeScript + Vite**, this project allows you to search cards from the [YGOPRODeck API](https://ygoprodeck.com/api-guide/), add them to your collection, and persist them locally.

> ⚡ MVP Focus: Local-only app (no authentication or cloud sync yet).  
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
| **Local Storage** | Localforage (IndexedDB wrapper) |
| **Styling** | TailwindCSS |
| **API** | YGOPRODeck REST API |
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

### 3️⃣ Run the Development Server

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
│  └─ collectionStore.ts    # Zustand store with persistence
├─ services/
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

* [ ] Project scaffolding (React + TS + Tailwind + Zustand)
* [ ] Card search using API
* [ ] Local collection store
* [ ] Collection view with add/remove
* [ ] Persistence via IndexedDB
* [ ] Responsive design polish
* [ ] Initial deployment (Netlify/Vercel)

### 🔜 Phase 2 — Cloud & Accounts

* [ ] Add Supabase or Firebase for sync and authentication
* [ ] Support multiple devices per user
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
| `npm run lint`    | Lint code (optional setup) |

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

```
