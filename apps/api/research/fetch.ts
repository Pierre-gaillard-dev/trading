import { DATASETS, fetchAndCache, isCached, datasetLabel } from './lib/datasets';

/**
 * Télécharge tous les jeux de données de `DATASETS` dans le cache local
 * (apps/api/research/data/). Idempotent : ignore ce qui est déjà présent
 * sauf si on passe --force.
 */
async function main(): Promise<void> {
  const force = process.argv.includes('--force');
  for (const ds of DATASETS) {
    const label = datasetLabel(ds);
    if (!force && isCached(ds)) {
      console.log(`✓ ${label} (déjà en cache)`);
      continue;
    }
    process.stdout.write(`… ${label} `);
    const n = await fetchAndCache(ds);
    console.log(`→ ${String(n)} bougies`);
  }
  console.log('Terminé.');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
