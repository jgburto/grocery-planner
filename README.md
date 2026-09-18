# 🛒 Grocery Planner

A web app to automate grocery shopping by planning weekly meals from a saved "meal bank" and auto-generating a categorized grocery list.

## Quick Start

### Option 1: Run with Python's built-in server (recommended)

```bash
cd grocery-planner
python3 -m http.server 8791
```

Then open **[http://localhost:8791](http://localhost:8791)** in your browser.

### Option 2: Open directly

Just double-click `index.html` to open it in your browser. (Works, but server mode is more reliable for forms and storage.)

## 📱 Using it on your iPhone

The app installs like a real app on your Home Screen — full-screen, its own icon, no browser address bar. Here's how to set it up:

### Step 1: Start the server on your Mac, reachable on your home Wi-Fi

Instead of `localhost`, bind the server so your iPhone can reach it over Wi-Fi:

```bash
cd grocery-planner
python3 -m http.server 8791
```

By default this listens on all network interfaces, so it's already reachable from other devices on the same Wi-Fi network.

### Step 2: Find your Mac's local IP address

```bash
ipconfig getifaddr en0
```

This prints something like `192.168.0.230`. (If that returns nothing, try `ipconfig getifaddr en1`.)

### Step 3: Open it on your iPhone

1. Make sure your iPhone is on the **same Wi-Fi network** as your Mac
2. Open **Safari** (must be Safari, not Chrome) and go to `http://<your-mac-ip>:8791` — e.g. `http://192.168.0.230:8791`
3. Tap the **Share** button (square with an arrow) at the bottom of the screen
4. Tap **Add to Home Screen**
5. Tap **Add**

You'll now have a "Grocery" icon on your Home Screen that opens full-screen, just like a native app.

### Notes on this setup

- Your Mac needs to be **awake and running the server** whenever you want to open the app — it's serving the app directly from your machine on your local network.
- This works great for planning at home. If you want the list available anywhere (e.g. cell data at the store with no Wi-Fi), open the app once while on Wi-Fi before you leave — the page keeps working without a network connection as long as you don't force-quit or reload it, since everything runs locally in the browser tab and your data is saved in the phone's local storage.
- For "install once, always works anywhere, even after restarting the app" — the kind of experience you get from an App Store app — you'd want to host this on a real internet server with HTTPS (e.g. Netlify, Vercel, GitHub Pages). That's a bigger step involving deployment and possibly a paid/free hosting account; let me know if you want help setting that up later.

## Features

### 📋 Weekly Menu
- **7×4 grid** (days × meal types: breakfast, lunch, dinner, snacks)
- **Dropdown per cell** — pick from 60+ pre-seeded meals or add a custom one-off meal
- **Multi-select snacks** — add multiple snacks per day
- **Auto-saved** — your grid persists in the browser

### 🥣 Meal Bank
- **60+ meals** seeded from your template (breakfast, lunch, dinner, snacks)
- **Editable** — add, edit, or delete meals
- **Ingredient tracking** — each meal stores ingredients with section + optional quantity
- **Filterable by category** — view one meal type at a time

### 🛍️ Grocery List Generator
- Click **"Generate grocery list from this week"** to pull all ingredients from your filled grid
- **Auto-deduped** — "garlic" used in 3 meals → one line item, tagged "used in 3 meals"
- **Organized by section**: Produce, Meat & Seafood, Dairy & Eggs, Pantry & Grains, Canned & Frozen, Condiments & Extras
- **Checkable** — tick off items while shopping; checked state persists across regenerations
- **Regenerate anytime** — changes to your grid automatically update the list

### 📅 History
- **Save weeks** — label and store past weeks
- **Load past weeks** — restore an old week into the current grid
- **Delete weeks** — remove old snapshots

## How to Use

1. **Start with the Weekly Menu tab**
   - Select a day and meal type (breakfast, lunch, etc.)
   - Click the dropdown and pick a meal from the bank, or type a custom meal
   - For snacks, click **"+ add snack..."** to add multiples per day

2. **Fill out your full week**
   - Repeat for all days and meal types
   - You can leave cells empty if you want

3. **Generate your grocery list**
   - Click **"Generate grocery list from this week"**
   - Review the organized list, check off items as you shop
   - Save the tab or take a screenshot to use while at the store

4. **Customize meals (optional)**
   - Go to the **Meal Bank** tab
   - Click **"Edit"** on any meal to adjust ingredients or quantities
   - Click **"+ Add meal"** to create new meals from scratch
   - Click **"Delete"** to remove meals you don't use

5. **Keep history (optional)**
   - Click **"Save as past week"** to label and store the current week
   - Later, load any past week from the **History** tab

## Data Storage

- Everything is stored in your browser's **localStorage** (no server, no login, no cloud sync)
- Data persists across browser sessions until you clear your browser cache
- Clearing browser data **will** delete your meal bank and past weeks, so back them up if you need them

## Customizing the Meal Bank

The app comes with 60+ meals pre-loaded from your template. To adjust:

1. Go to the **Meal Bank** tab
2. **Edit** any meal to change the name, cuisine tag, or ingredients
3. **Delete** meals you don't want
4. **Add** new meals with **"+ Add meal"**

**Tip:** Each ingredient has a section (Produce, Meat & Seafood, etc.). The grocery list uses these sections to organize your list, so consistency here matters.

## Tips

- **Rotate meals freely** — use the same breakfasts and snacks every week; rotate dinners and lunches
- **Leftover lunches** — if Monday dinner is "Roast chicken," Tuesday lunch could be "Leftover chicken bowl"
- **One-off meals** — type a custom meal name if you want something not in the bank (it won't be saved for next week)
- **Custom ingredients** — if a meal in the bank is missing an ingredient you need, edit it and add the ingredient
- **Shopping on mobile** — this app is mobile-friendly; take it with you to the store

## Files

- `index.html` — main page (start here)
- `style.css` — styling
- `app.js` — app logic (all tabs, grid, grocery list, persistence)
- `seed.js` — pre-loaded meals and categories
- `manifest.json` — PWA config (app name, icon, colors) used for "Add to Home Screen"
- `sw.js` — service worker for offline caching (works once hosted on HTTPS or accessed via `localhost`)
- `icons/` — app icons in the sizes iOS/Android expect
- `README.md` — this file

## Troubleshooting

**"The page won't load"**
- Make sure you're running the Python server (`python3 -m http.server 8791`)
- Or open `index.html` directly, though the server is more reliable

**"My data disappeared"**
- You may have cleared your browser cache. localStorage isn't synced across devices.
- Next time, use **"Save as past week"** regularly to keep backups

**"How do I back up my meal bank?"**
- Open your browser's Developer Tools (F12 or Cmd+Option+I)
- Go to **Application** → **Local Storage**
- Copy the `gp_mealBank` value and save it somewhere safe

---

Enjoy planning your meals and shopping! 🛒
