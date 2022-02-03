import { invalidate } from "$app/navigation";
import { EventData, eventName, log } from "./const.js";

if (import.meta.hot) {
    log("registering hmr listener");
    import.meta.hot.on(eventName, (data: EventData) => {
        log("invalidate-resources", data);
        data.forEach(element => {
            void invalidate(element);
        });
    });
}
