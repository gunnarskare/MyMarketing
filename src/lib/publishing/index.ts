import { stubAdapter } from "./stub";
import type { Platform, PublishingAdapter } from "./types";

const adapters: Record<Platform, PublishingAdapter> = {
  facebook: stubAdapter("facebook"),
  instagram: stubAdapter("instagram"),
  linkedin: stubAdapter("linkedin"),
};

export function getAdapter(platform: Platform): PublishingAdapter {
  return adapters[platform];
}

export * from "./types";
