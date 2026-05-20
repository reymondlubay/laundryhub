type NetworkFailureHandler = () => void;

let onNetworkFailure: NetworkFailureHandler | null = null;

export const registerNetworkFailureHandler = (
  handler: NetworkFailureHandler,
): void => {
  onNetworkFailure = handler;
};

export const notifyNetworkFailure = (): void => {
  onNetworkFailure?.();
};
