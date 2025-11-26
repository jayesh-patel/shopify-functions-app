# X for Y Discount Shopify App

A fully-embedded Shopify app that lets merchants configure "X items for $Y" bundle discounts across hundreds of product variants. The solution ships with a Polaris-based admin UI, a persistent configuration store, and a Shopify Function that enforces pricing in the cart and at checkout.

## Tech stack
- Shopify Functions (product discounts)
- Remix + @shopify/shopify-app-remix
- Polaris 12 UI kit
- Prisma + SQLite (can be swapped for Postgres/MySQL)
- Docker-ready Node 20 runtime

## Repository layout
```
/
├─ shopify.app.toml            # App + extension registration
├─ Dockerfile                  # Production image (npm workspaces aware)
├─ web/                        # Remix admin + backend
│  ├─ app/                     # Routes, components, Shopify logic
│  ├─ prisma/schema.prisma     # Session + bundle config models
│  └─ package.json             # Remix workspace
└─ extensions/x-for-y-discount # Shopify Function source
   ├─ input.graphql            # Function input schema
   └─ src/run.ts               # Bundle-pricing algorithm
```

## Prerequisites
1. Node.js 20+
2. npm 10+
3. Shopify CLI 3.x (for `app` + `function` commands)
4. A Shopify Partner account + development store

## Environment
Copy `.env.example` to `.env` inside `/web` (or root) and supply values:
```
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
SHOPIFY_APP_URL=https://your-app-domain.example
SCOPES=read_products,write_products,write_discounts
DATABASE_URL="file:./prisma/dev.db"
SESSION_SECRET=long-random-string
```
> `DATABASE_URL` can target any Prisma-supported database. Replace with Postgres/MySQL when deploying outside of development.

## Install & database
```bash
npm install                              # installs root + all workspaces
npm run prisma:push --workspace web      # pushes Prisma schema (SQLite by default)
```

## Local development
1. Start the Remix dev server (`npm run dev`).
2. In another terminal, build/watch the function if you are editing it: `npm run build:function` (or use `shopify function run`).
3. Use `shopify app dev --tunnel-url <https://ngrok-url>` to expose the app to your dev store.

The admin UI lives under `/app` and contains:
- Inputs for bundle size (X) and bundle price (Y)
- Editable label that appears on cart/checkout discounts
- A searchable variant picker to add/remove hundreds of variants

## Discount flow
1. Select eligible variants and save the settings.
2. The server stores the config in `ShopConfig` (per shop) and upserts an Automatic App Discount that points to the Shopify Function.
3. The function receives the configuration via metafield and makes sure every group of X eligible items totals exactly Y dollars, stacking multiples automatically.

## Deploying the function
```bash
npm run build:function                            # compiles to dist/function.wasm
shopify app function push --extension-id <id>     # registers the wasm with Shopify
```
> Run `shopify app function build --processes 4` for faster builds on CI.

## Deploying the web app
### Option 1 – Node host (Render, Fly, Railway, etc.)
1. Build the Remix app: `npm run build:web`.
2. Provide environment variables (`SHOPIFY_*`, `DATABASE_URL`, `SESSION_SECRET`, `PORT`).
3. Start with `npm run deploy` (runs `remix-serve`).

### Option 2 – Docker
```bash
docker build -t x-for-y-discount .
docker run -p 8080:8080 \
  -e SHOPIFY_API_KEY=... \
  -e SHOPIFY_API_SECRET=... \
  -e SHOPIFY_APP_URL=https://your-prod-domain \
  -e SCOPES=read_products,write_products,write_discounts \
  -e DATABASE_URL="file:/data/prod.db" \
  -e SESSION_SECRET=super-secret \
  x-for-y-discount
```

## Testing checklist
- [ ] Configure bundle (e.g., 4 items for $20) and assign multiple variants.
- [ ] Add varying-price eligible items to the dev-store cart; verify the discount message.
- [ ] Add 8/12/etc items to confirm stacking behaviour.
- [ ] Remove variants from config and confirm the discount stops applying.
- [ ] App uninstall webhook cleans stored config (`ShopConfig`).

## Notes & next steps
- Swap SQLite for a managed database before production.
- Extend the GraphQL queries in `app/routes/app.variants.tsx` if you need pagination beyond 25 results per search.
- Harden authentication on the variant search endpoint if you expose additional data.
- Consider scheduling health pings for the Automatic Discount to ensure the function remains attached after deployments.
