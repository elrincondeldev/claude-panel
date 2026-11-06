/** Shared clocks: sprites animate in step, and "5m" labels refresh together. */
export const clock = $state({ frame: 0, now: Date.now() });

setInterval(() => clock.frame++, 250);
setInterval(() => (clock.now = Date.now()), 10_000);
