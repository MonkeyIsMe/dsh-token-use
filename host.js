// Entry shim. Two Host facts make this indirection worth it:
//
// 1. `inject` is read from the entry module *before* `apply` runs, so it must be a
//    static export.
// 2. The loader imports an entry once per resolved URL and Node keeps that namespace
//    in its ESM cache for the life of the Host process (`dsh-app-boot` `importFailure`
//    notes Node "returns from its cache"), so code edited in place never reaches a
//    running Host. The query stamp below makes every activation re-read `./impl.js`,
//    so a fix ships by reinstalling the bundle instead of restarting the GUI.
export const inject = ['sessionQuery', 'connection', 'webServer'];

export async function apply(ctx, config) {
  const impl = await import(new URL(`./impl.js?v=${Date.now()}`, import.meta.url).href);

  const declared = Array.isArray(impl.inject) ? impl.inject : [];
  const missing = declared.filter((name) => !inject.includes(name));
  if (missing.length > 0) {
    throw new Error(`dsh-token-stats: entry inject must also declare ${missing.join(', ')}`);
  }

  return impl.apply(ctx, config);
}
