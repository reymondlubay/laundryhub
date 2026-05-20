const HEALTH_PATH = "/health";
const HEALTH_FETCH_TIMEOUT_MS = 3000;

export const getHealthCheckUrl = (): string => {
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (!apiBase) {
    throw new Error(
      "Missing VITE_API_BASE_URL. Set it in frontend .env (e.g. VITE_API_BASE_URL=/api).",
    );
  }

  const trimmed = apiBase.replace(/\/$/, "");
  return `${trimmed}${HEALTH_PATH}`;
};

export const checkBackendHealth = async (): Promise<boolean> => {
  const url = getHealthCheckUrl();
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    HEALTH_FETCH_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    return response.status === 200;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
};
