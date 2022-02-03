import path from "path";
import picomatch from "picomatch";
import type { Plugin } from "vite";

type InvalidateConfig = {
    watch: string | string[];
    invalidate?: string | string[];
};

type InvalidateData = {
    watch: string[];
    invalidate: string[];
};

type Options = Config & {
    patterns: string[] | InvalidateConfig | InvalidateConfig[];
};

type Config = {
    patterns: InvalidateConfig[];
    verbose?: boolean;
    routesRoot?: string;
    importersTransform?: (importers: string[]) => string[];
};

export type EventData = string[];

const asArray = <T>(value?: T | T[]): T[] => (Array.isArray(value) ? value : value ? [value] : []);
const isStrArray = (value: any): value is string[] => Array.isArray(value) && typeof value[0] === "string";

export const pluginName = "sveltekit-fetch-invalidate";
export const eventName = "sveltekit-invalidate-resources";
export const pluginTag = `[${pluginName}]`;

export const fetchInvalidateCode = `
import { invalidate } from "$app/navigation";

if (import.meta.hot) {
    console.log("${pluginTag} registering hmr listener");
    import.meta.hot.on("${eventName}", (data) => {
        console.log("${pluginTag} invalidate-resources", data);
        data.forEach(element => invalidate(element));
    });
}
`;

function normalizeConfig(options: Options) {
    const patterns = isStrArray(options.patterns) ? { watch: options.patterns } : options.patterns;
    return {
        ...options,
        routesRoot: options.routesRoot ?? "src/routes",
        patterns: asArray(patterns),
    };
}

export function fetchInvalidate(options: Options): Plugin {
    const config = normalizeConfig(options);

    const list: InvalidateData[] = asArray(config.patterns).map(conf => {
        return {
            watch: asArray(conf.watch),
            invalidate: asArray(conf.invalidate),
        };
    });

    const log = (...args: any[]) => console.log(pluginTag, ...args);
    const verbose = config.verbose ? log : () => {};

    verbose(`initialized`);

    const hmrListenerModuleId = "vite-plugin-sveltekit-fetch-invalidate/hmr-listener";
    const virtualModuleId = "\0" + hmrListenerModuleId;

    return {
        name: pluginName,
        apply: "serve",
        enforce: "pre",

        configureServer(server) {
            list.forEach(data => {
                log("Adding watchers for:", data.watch);
                server.watcher.add(data.watch);
            });
        },

        resolveId(id) {
            verbose("resolveId", id);
            if (id === hmrListenerModuleId) {
                verbose("substituting:", virtualModuleId);
                return virtualModuleId;
            }
        },

        load(id) {
            verbose("load", id);
            if (id === virtualModuleId) {
                verbose("returning content for fetch-invalidate");
                return fetchInvalidateCode;
            }
        },

        handleHotUpdate(ctx) {
            verbose("handleHotUpdate", ctx.file);

            const root = ctx.server.config.root;
            const importerRoot = path.resolve(root, config.routesRoot);

            let matched = list?.filter(data => {
                return data.watch.some(glob => {
                    const relative = path.relative(root, ctx.file);
                    const matcher = picomatch(glob);
                    const isMatch = matcher(relative);
                    if (isMatch) {
                        log(`watcher '${glob}' triggered: ${relative}`);
                    }
                    return isMatch;
                });
            });

            if (matched.length) {
                const targetsToInvalidate: EventData = matched.flatMap(data => data.invalidate);

                const importers = ctx.modules
                    .flatMap(module => [...module.importers])
                    .map(node => node.file || "")
                    .filter(_ => _);

                let importerFiles: string[] = importers.map(file => "/" + path.relative(importerRoot, file));

                if (config.importersTransform) {
                    importerFiles = config.importersTransform(importers);
                } else {
                    importerFiles = importerFiles
                        .map(file => file.replace(/\.(js|ts)$/, ""))
                        .filter(_ => _.endsWith(".json"));
                }

                targetsToInvalidate.push(...importerFiles);

                log("invalidating targets:", targetsToInvalidate);

                ctx.server.ws.send({
                    type: "custom",
                    event: eventName,
                    data: targetsToInvalidate,
                });
            }
        },
    };
}
