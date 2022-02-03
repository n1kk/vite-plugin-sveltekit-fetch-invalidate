import path from "path";
import picomatch from "picomatch";
import type { Plugin } from "vite";
import { EventData, eventName, log, pluginName } from "./const.js";
import { fileURLToPath } from "url";

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
    verbose?: boolean | number;
    routesRoot?: string;
    importersTransform?: (importers: string[]) => string[];
};

const asArray = <T>(value?: T | T[]): T[] => (Array.isArray(value) ? value : value ? [value] : []);
const isStrArray = (value: any): value is string[] => Array.isArray(value) && typeof value[0] === "string";
const dirname = path.dirname(fileURLToPath(import.meta.url));

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

    const verbose = Number(config.verbose);
    const trace = verbose ? (level: number, ...args: any[]) => level <= verbose && log(...args) : () => {};

    trace(1, `initialized`);

    const hmrListenerFilepath = path.resolve(dirname, "hmr-listener.js");

    return {
        name: pluginName,
        apply: "serve",
        enforce: "pre",

        configureServer(server) {
            list.forEach(data => {
                trace(1, "Adding watchers for:", data.watch);
                server.watcher.add(data.watch);
            });
        },

        resolveId(id) {
            trace(2, "resolveId", id);
            if (id === "vite-plugin-sveltekit-fetch-invalidate/hmr-listener") {
                trace(1, "substituting:", id);
                return hmrListenerFilepath;
            }
        },

        load(id) {
            trace(2, "load", id);
            if (id === hmrListenerFilepath) {
                trace(1, "redirecting to fetch-invalidate.js");
                return `import "./fetch-invalidate.js";`;
            }
        },

        handleHotUpdate(ctx) {
            trace(2, "handleHotUpdate", ctx.file);

            const root = ctx.server.config.root;
            const importerRoot = path.resolve(root, config.routesRoot);

            let matched = list?.filter(data => {
                return data.watch.some(glob => {
                    const relative = path.relative(root, ctx.file);
                    const matcher = picomatch(glob);
                    const isMatch = matcher(relative);
                    if (isMatch) {
                        trace(1, `watcher '${glob}' triggered: ${relative}`);
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

                trace(1, "invalidating targets:", targetsToInvalidate);

                ctx.server.ws.send({
                    type: "custom",
                    event: eventName,
                    data: targetsToInvalidate,
                });
            }
        },
    };
}
