# 🛒 Grocery Planner

A web app to automate grocery shopping by planning weekly meals from a saved "meal bank" and auto-generating a categorized grocery list.

## Quick Start

The app is published over HTTPS with GitHub Pages:

**https://jgburto.github.io/grocery-planner/**

Every merge to `main` redeploys it within a minute or two. Nothing needs to run on your Mac.

## 📱 Using it on your iPhone

1. Open **Safari** (must be Safari, not Chrome) and go to **https://jgburto.github.io/grocery-planner/**
2. Tap the **Share** button (square with an arrow)
3. Tap **Add to Home Screen**, then **Add**

You'll get a "Grocery" icon that opens full-screen like a native app. Because the site is served over HTTPS, the service worker installs, and the app keeps working offline, e.g. at the store with no signal, even after you close and reopen it.

### Why HTTPS instead of serving from the Mac

Older versions of these instructions served the app from your Mac over plain `http://` on home Wi-Fi. Anyone else on that network could tamper with the files in transit. That matters once the app holds secrets, such as the Agent Chef API key. Plain HTTP also blocks offline mode on iPhone. Use the HTTPS URL above on every device.

**Moving from the old address:** your data lives in the browser, per site address. Opening the HTTPS URL starts with the default meal bank; anything you saved at `http://<mac-ip>:8791` stays there and does not carry over.

## Local development

For working on the code, serve it from the project folder:

```bash
python3 -m http.server 8791
```

Then open **[http://localhost:8791](http://localhost:8791)**. `localhost` counts as a secure context, so the service worker works here too. Don't point other devices at your Mac's IP over plain HTTP; use the published HTTPS URL instead.

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

- Everything is stored in your browser's **localStorage** (no login, no cloud sync). GitHub Pages only serves the app files; your data never leaves the device
- Storage is per device *and* per site address: the HTTPS site, `localhost`, and any old `http://<mac-ip>` address each have their own separate data
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
