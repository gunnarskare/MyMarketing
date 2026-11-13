import {
  NotImplementedError,
  type Platform,
  type PublishingAdapter,
} from "./types";

/** Plassholder til plattformen bygges (fase 2 og 4 i MVP-planen). */
export function stubAdapter(platform: Platform): PublishingAdapter {
  const fail = (method: string): never => {
    throw new NotImplementedError(platform, method);
  };
  return {
    platform,
    getConnectUrl: () => fail("getConnectUrl"),
    handleCallback: async () => fail("handleCallback"),
    publish: async () => fail("publish"),
    refreshToken: async () => fail("refreshToken"),
    fetchMetrics: async () => fail("fetchMetrics"),
  };
}
