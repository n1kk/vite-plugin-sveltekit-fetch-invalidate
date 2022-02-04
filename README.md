# vite-plugin-sveltekit-fetch-invalidate

Vite plugin to help automating SvelteKit json endpoints invalidation and hot reload.

It can automatically infer URLs to invalidate, to a certain extent. If your endpoints have no parameters in them (like `[slug]`) it will iterate over modules that were importing modified file and resolve them to the relative path of the routes root. By default, it will remove `.js|.ts` extension and filter by `.json`, but this behavior can be modified. If you do have parameters in your URLs you will have to specify the invalidation list manually.

The sub import `/hmr-listener` is pointing to an empty file, the plugin runs only in serve mode and substitutes that import with hrm listener code. This way no extra code is included in your production bundle.

### Usage

```js
// svelte.config.js
import { fetchInvalidate } from "vite-plugin-sveltekit-fetch-invalidate";

export default {
  kit: {
    vite: {
      plugins: [
        fetchInvalidate({
          patterns: ["src/blog/**/*.mdx"],
          routesRoot: "src/routes",
        }),
      ],
    },
  },
};
```

Import hmr listener in your root `__layout.svelte`:

```ts
import "vite-plugin-sveltekit-fetch-invalidate/hmr-listener";
```

### Options

```ts
type Config = {
  patterns: string[] | InvalidateConfig | InvalidateConfig[];
  routesRoot?: string; // defaults to "src/routes"
  importersTransform?: (importers: string[]) => string[];
  verbose?: boolean;
};
type InvalidateConfig = {
  watch: string | string[];
  invalidate?: string | string[];
};
```

```ts
// simple
fetchInvalidate({
  patterns: ["src/blog/**/*.mdx"],
});

// same as above
fetchInvalidate({
  patterns: {
    watch: ["src/blog/**/*.mdx"],
  },
});

// same as above with custom ivalidation list
fetchInvalidate({
  patterns: {
    watch: ["src/blog/**/*.svelte", "src/blog/**/*.mdx"],
    // if your endpoint has a param in it then invalidating `/api/[type].json` won't work, you have to specify manual list
    invalidate: ["/api/posts.json"],
  },
});

// complex
fetchInvalidate({
  patterns: [
    {
      watch: ["src/blog/**/*.mdx"],
      invalidate: ["/api/timestamps.json"],
    },
    {
      watch: ["src/items/**/*.json", "src/model/**/*.ts"],
      invalidate: ["/api/prices.json"],
    },
    {
      watch: ["src/**/*.ts"],
    },
  ],
  routesRoot: "src/website",
  importersTransform: importers => {
    return (
      importers
        // this is the default behavior
        .map(file => file.replace(/\.(js|ts)$/, ""))
        .filter(file => file.endsWith(".json"))
    );
  },
});
```
