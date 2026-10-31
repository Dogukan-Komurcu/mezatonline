// Expo Router's navigation tree already handles push/back/replace. The portable
// file has no HTTP routes, so the browser URL adapter intentionally does no IO.
export function createBrowserHistoryAdapter() {
  return { apply: () => {}, listen: () => () => {} };
}
