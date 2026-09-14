import { BusinessChannelAdapter } from "./business.ts";
import type {
  ChannelAdapter,
  ChannelKind,
} from "./types.ts";

const adapters: Record<
  ChannelKind,
  ChannelAdapter | null
> = {
  BUSINESS: new BusinessChannelAdapter(),
  DIGITAL_PRODUCT: null,
  CONTENT: null,
  MARKET_RESEARCH: null,
};

export function getChannelAdapter(
  kind: ChannelKind
): ChannelAdapter {
  const adapter = adapters[kind];

  if (!adapter) {
    throw new Error(
      `Channel adapter ${kind} is not implemented yet`
    );
  }

  return adapter;
}

export function implementedChannels(): ChannelKind[] {
  return (
    Object.entries(adapters) as [
      ChannelKind,
      ChannelAdapter | null
    ][]
  )
    .filter(([, adapter]) => adapter !== null)
    .map(([kind]) => kind);
}
