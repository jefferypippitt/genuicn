export function hostOf(url: string): string {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./u, "");
  } catch {
    return url;
  }
}
