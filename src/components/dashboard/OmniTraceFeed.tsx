import { memo } from 'react';

interface OmniTraceFeedProps {
  maxEntries?: number;
  className?: string;
}

export const OmniTraceFeed = memo(function OmniTraceFeed(
  _props: OmniTraceFeedProps,
) {
  return (
    <div className="omni-trace-feed" data-testid="omni-trace-feed" />
  );
});

export default OmniTraceFeed;
