# FeedbackFlow icons

This directory contains the SVG assets referenced by the FeedbackFlow Figma file.

- Figma exports were taken from the named icon root nodes with surrounding canvas content excluded.
- Icons declared in `_codex-metadata` but not preserved as named vector nodes were downloaded from the official Lucide repository.
- `filter.svg` maps the legacy Lucide `Filter` name to `funnel`.
- `sort-desc.svg` maps the legacy Lucide `SortDesc` name to `arrow-down-wide-narrow`.
- Figma-exported state icons retain their design colors. Lucide-source icons use `currentColor`; inline them when runtime color inheritance is required.
- See `manifest.json` for source and Figma node provenance.

Use a public asset directly:

```tsx
<img src="/icons/search.svg" alt="" width={24} height={24} />
```

Or import a typed path from `@/lib/icons`.
