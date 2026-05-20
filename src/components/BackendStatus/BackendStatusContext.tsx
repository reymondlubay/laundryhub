import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { checkBackendHealth } from "../../utils/backendHealth";
import { registerNetworkFailureHandler } from "../../utils/backendNetworkHandler";

export type BackendStatus = "checking" | "ready" | "reconnecting" | "unavailable";

type BackendStatusContextValue = {
  status: BackendStatus;
  retry: () => void;
};

const POLL_INTERVAL_MS = 500;
const MAX_WAIT_MS = 120_000;

const BackendStatusContext = createContext<BackendStatusContextValue | null>(
  null,
);

export const useBackendStatus = (): BackendStatusContextValue => {
  const ctx = useContext(BackendStatusContext);
  if (!ctx) {
    throw new Error("useBackendStatus must be used within BackendStatusProvider");
  }
  return ctx;
};

type BackendStatusProviderProps = {
  children: ReactNode;
};

export const BackendStatusProvider = ({
  children,
}: BackendStatusProviderProps) => {
  const [status, setStatus] = useState<BackendStatus>("checking");
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const wasReadyRef = useRef(false);
  const reconnectingRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const markReady = useCallback(() => {
    stopPolling();
    const wasReconnecting = reconnectingRef.current;
    reconnectingRef.current = false;
    wasReadyRef.current = true;
    setStatus("ready");

    if (wasReconnecting) {
      window.location.reload();
    }
  }, [stopPolling]);

  const pollOnce = useCallback(async (): Promise<boolean> => {
    const healthy = await checkBackendHealth();
    if (healthy) {
      markReady();
      return true;
    }

    const elapsed = Date.now() - startedAtRef.current;
    if (elapsed >= MAX_WAIT_MS) {
      stopPolling();
      setStatus("unavailable");
      return false;
    }

    return false;
  }, [markReady, stopPolling]);

  const startPolling = useCallback(
    (initialStatus: "checking" | "reconnecting") => {
      stopPolling();
      startedAtRef.current = Date.now();
      setStatus(initialStatus);

      void pollOnce();
      pollTimerRef.current = setInterval(() => {
        void pollOnce();
      }, POLL_INTERVAL_MS);
    },
    [pollOnce, stopPolling],
  );

  const retry = useCallback(() => {
    startPolling(wasReadyRef.current ? "reconnecting" : "checking");
  }, [startPolling]);

  const beginReconnect = useCallback(() => {
    if (
      !wasReadyRef.current ||
      reconnectingRef.current ||
      pollTimerRef.current !== null
    ) {
      return;
    }
    reconnectingRef.current = true;
    startPolling("reconnecting");
  }, [startPolling]);

  useEffect(() => {
    startPolling("checking");
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  useEffect(() => {
    registerNetworkFailureHandler(beginReconnect);
  }, [beginReconnect]);

  return (
    <BackendStatusContext.Provider value={{ status, retry }}>
      {children}
    </BackendStatusContext.Provider>
  );
};
