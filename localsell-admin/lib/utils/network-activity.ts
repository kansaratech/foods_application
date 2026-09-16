/** Counts concurrent requests and avoids flashing for fast responses. */
export function createNetworkActivity(delayMs = 250, minimumMs = 400) {
  let pending = 0;
  let visible = false;
  let shownAt = 0;
  let showTimer: ReturnType<typeof setTimeout> | undefined;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const publish = (next: boolean) => {
    if (visible === next) return;
    visible = next;
    listeners.forEach((listener) => listener());
  };
  return {
    getSnapshot: () => visible,
    getServerSnapshot: () => false,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    begin: () => {
      pending += 1;
      clearTimeout(hideTimer);
      if (!visible && !showTimer)
        showTimer = setTimeout(() => {
          showTimer = undefined;
          if (pending > 0) {
            shownAt = Date.now();
            publish(true);
          }
        }, delayMs);
      let finished = false;
      return () => {
        if (finished) return;
        finished = true;
        pending = Math.max(0, pending - 1);
        if (pending > 0) return;
        clearTimeout(showTimer);
        showTimer = undefined;
        if (visible)
          hideTimer = setTimeout(
            () => {
              if (pending === 0) publish(false);
            },
            Math.max(0, minimumMs - (Date.now() - shownAt))
          );
      };
    },
  };
}
export const networkActivity = createNetworkActivity();
