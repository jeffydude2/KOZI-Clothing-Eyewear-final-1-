# KOZI — Clothing + Eyewear

Group final project for Web Publishing and Digital Advertising. KOZI is a fictional chrome eyewear and streetwear label from Angeles City, Philippines.

## Pages
| File | Purpose |
|---|---|
| `index.html` | Landing page: hero, about, featured products, promo countdown, banner, promo video, customer crew |
| `products.html` | Product grid with search, category filter, sort, options picker and shopping bag |
| `features.html` | Feature cards, stat bars, photo gallery |
| `campaign.html` | Social media campaign ("Chrome Eyes Drop") and email marketing mockup |
| `contact.html` | Validated contact form, company info, customer table |

## Data / API integration (GET)
`js/app.js` retrieves both datasets with `fetch()`:
- `data/products.json` -> featured pieces, product grid, shopping bag
- `data/customers.json` -> "The crew" cards (home) and customer table (contact)

`data/data.js` holds the same records as an offline fallback for when a page is opened directly from disk.

## Run locally
Use a local server so `fetch()` works:

    python -m http.server 8000

Then open http://localhost:8000. On GitHub, enable Pages (Settings > Pages > main branch, root) for a hosted link.

## Structure
    index.html, products.html, features.html, campaign.html, contact.html
    css/style.css
    js/app.js      layout, data rendering, forms
    js/shop.js     product options, bag, checkout
    data/          products.json, customers.json, data.js
    assets/        images, lookbook, products, logo

Promo code: `KOZI26` (20% off). Customer data is fictional sample data.
