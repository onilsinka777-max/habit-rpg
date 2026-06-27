#!/bin/sh
set -e

echo "=== Railway start: applying schema ==="
npx prisma db push --accept-data-loss
echo "=== Schema OK, running seeds ==="
node prisma/seed.js || echo "WARN: seed.js"
node prisma/seedShop.js || echo "WARN: seedShop.js"
node prisma/seedLegendary.js || echo "WARN: seedLegendary.js"
node prisma/seedMegaUpdate.js || echo "WARN: seedMegaUpdate.js"
node prisma/seedWave2.js || echo "WARN: seedWave2.js"
node prisma/seedBoosters.js || echo "WARN: seedBoosters.js"
node prisma/seedChainUpdate.js || echo "WARN: seedChainUpdate.js"
echo "=== Seeds done, starting server ==="
exec node src/server.js
