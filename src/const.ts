export const pluginName = "sveltekit-fetch-invalidate";
export const eventName = "sveltekit-invalidate-resources";
export const log = (...rest: any[]) => console.log(`[${pluginName}]`, ...rest);
export type EventData = string[];
