# vite-plugin-sveltekit-fetch-invalidate

Vite plugin to help automating SvelteKit json endpoints invalidation and hot reload.

If your endpoints have no parameters in them (like `[slug]`) it will automatically importers of modified file and resolve them to the relative path of the routes root.

The sum import `/hmr-listener` is pointing to an empty file and is redirected by the plugin to the actual listener only in development. This way no extra code is included in your production bundle.

### Usage

Import it and add to vite plugins array:

```js
import { fetchInvalidate } from "vite-plugin-sveltekit-fetch-invalidate";

const plugin = fetchInvalidate({
  patterns: ["src/blog/**/*.mdx"],
  routesRoot: "src/routes",
});

const svelteKitConfig = {
  kit: {
    vite: {
      plugins: [plugin],
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
  verbose?: boolean;
  routesRoot?: string;
  importersTransform?: (importers: string[]) => string[];
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
    // if your endpoint has a param in it invalidating it won't work, you have to specify manual list
    invalidate: ["/api/get-posts.json"],
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
      watch: ["src/items/**/*.mdx"],
      invalidate: ["/api/prices.json"],
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
