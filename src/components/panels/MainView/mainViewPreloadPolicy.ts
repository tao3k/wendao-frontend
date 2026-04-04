import type { MainViewTab } from "./mainViewTypes";

interface NetworkConnectionLike {
  saveData?: boolean;
  effectiveType?: string;
  downlink?: number;
}

interface NetworkNavigatorLike {
  connection?: NetworkConnectionLike;
  mozConnection?: NetworkConnectionLike;
  webkitConnection?: NetworkConnectionLike;
}

const SLOW_EFFECTIVE_TYPES = new Set(["slow-2g", "2g", "3g"]);

const readNetworkConnection = (): NetworkConnectionLike | undefined => {
  if (typeof navigator === "undefined") {
    return undefined;
  }

  const networkNavigator = navigator as Navigator & NetworkNavigatorLike;
  return (
    networkNavigator.connection ??
    networkNavigator.mozConnection ??
    networkNavigator.webkitConnection
  );
};

export const isConstrainedNetwork = (
  connection: NetworkConnectionLike | undefined = readNetworkConnection(),
): boolean => {
  if (!connection) {
    return false;
  }

  if (connection.saveData) {
    return true;
  }

  if (connection.effectiveType && SLOW_EFFECTIVE_TYPES.has(connection.effectiveType)) {
    return true;
  }

  if (
    typeof connection.downlink === "number" &&
    connection.downlink > 0 &&
    connection.downlink < 1.2
  ) {
    return true;
  }

  return false;
};

export const canPreloadMainViewTab = (
  tab: MainViewTab,
  connection: NetworkConnectionLike | undefined = readNetworkConnection(),
): boolean => {
  if (tab === "references") {
    return false;
  }

  if (!isConstrainedNetwork(connection)) {
    return true;
  }

  return tab === "content";
};
