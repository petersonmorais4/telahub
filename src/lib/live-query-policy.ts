// TV WebViews may emit offline/hidden signals while requests still work.
export const liveQueryPolicy = {
  networkMode: "always" as const,
  refetchIntervalInBackground: true,
  refetchOnWindowFocus: true,
  refetchOnReconnect: "always" as const,
  retry: 3,
  retryDelay: 5_000,
};

export function liveRefetchInterval(hasData: boolean): number {
  return hasData ? 10 * 60_000 : 5_000;
}