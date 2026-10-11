# Farmer Marketplace

A web-based agricultural marketplace that connects **farmers** directly with **buyers**.

```
Farmer lists product → Buyer discovers product → Buyer sends request
→ Farmer accepts / rejects → Request status is tracked
```

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Bootstrap 5, JavaScript, EJS |
| Backend | Node.js, Express.js |
| Database | MongoDB with Mongoose |
| Authentication | express-session, bcryptjs |
| AI | KNN price model and content-based recommendations (built in), Google Gemini or Claude API (optional) |

## Run the project

```bash
npm install
cp .env.example .env      # then fill in MONGO_URI and SESSION_SECRET
npm run dev               # development (nodemon)
# or
npm start
```

Open http://localhost:5000

## Features

**Public:** Home, Marketplace (search, category and location filters), product details, Farmers (real farmers with search), About, Contact (messages are saved to MongoDB).

**Farmer:** Register or login, dashboard with statistics and stock alerts, add/edit/delete own products, view requests (filter by status), accept or reject requests (stock is reduced automatically), notifications.

**Buyer:** Register or login, dashboard with personal recommendations, send product requests (quantity and message), My Requests with status, demo payment after acceptance, notifications.

### AI features

1. **AI Price Insight** for farmers (no API key needed). This is a k-nearest-neighbours model. It compares a product with the most similar listings sold in the same unit, using name similarity, category and location. It predicts a fair price as the similarity-weighted average and marks the farmer's price as fair, below or above market. It is shown on Add/Edit Product and on every product page.
2. **Smart Recommendations** for buyers (no API key needed). This is content-based filtering. It builds a preference profile from the buyer's past requests (categories, locations, product words) and ranks in-stock products against it. New buyers see popular products instead. Product pages also show **Similar Products**.
3. **AI Assistant** (optional, large language model): "Write with AI" product descriptions for farmers, and an AI Shopping Assistant on the marketplace for buyers. It can only pick products from the real catalog. It is enabled when `GEMINI_API_KEY` (Google Gemini, free tier, key from https://aistudio.google.com/apikey) or `ANTHROPIC_API_KEY` (Claude) is set in `.env`.

## Project structure

```
backend/
  config/constants.js        categories, units, app name
  controller/                auth, product, order, AI logic
  middleware/auth.js         requireLogin / requireFarmer / requireBuyer
  models/                    User, Product, Order, Notification, Contact, Farmer
  routes/                    page, auth, product, order, notification, payment, ai, farmer API
  services/                  priceInsight (KNN), recommendations, aiAssistant (Gemini / Claude)
  utils/helpers.js           flash messages, error page, safe regex
  server.js
frontend/src/
  components/header.ejs, footer.ejs
  pages/*.ejs
  assets/js/ai.js
```

## Main routes

| Route | Access |
|---|---|
| `/`, `/marketplace`, `/farmers`, `/about`, `/contact`, `/products/:id` | Public |
| `/register`, `/login` | Guests only |
| `/dashboard`, `/notifications`, `/logout` | Logged-in users |
| `/products/add`, `/products/my-products`, `/products/:id/edit`, `/products/:id/delete` | Farmer (owner) |
| `/orders/farmer-requests`, `/orders/:id/accept`, `/orders/:id/reject` | Farmer (owner) |
| `/orders/request/:productId`, `/orders/my-requests`, `/payment/:id` | Buyer |
| `/ai/price-insight`, `/ai/description` | Farmer (JSON) |
| `/ai/assistant` | Logged-in users (JSON) |
