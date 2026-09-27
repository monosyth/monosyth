# Dallas & Scott wedding gallery

Guest URL: https://monosyth.com/dallas-and-scott

A standalone, unlisted gallery for the 250 JPEGs supplied from Scott’s Desktop/Dallas and Scott folder. Scott chose access for anyone with the link, without a password. It is not linked in the site navigation or sitemap. Page metadata and the response X-Robots-Tag request no indexing, following, archival, or image indexing; these directives are not access control.

The visual direction comes from the actual wedding photographs: warm black, champagne gold, red booths and neon, crystal chandeliers, sequins, and marquee lights. The first twelve photos are editorial highlights; the remaining photos appear in source-number order. Chapter filters use source-number order. All source photos, including black-and-white variants, remain available. The grid loads 48 at a time, while the viewer can move through the entire active collection.

## Photo assets

Assets live in Monosyth’s existing Firebase Storage bucket, monosyth.firebasestorage.app, under wedding/dallas-and-scott/v1/. No bucket permissions or security rules were changed. Each asset has its own Firebase download token, recorded in apps/web/src/lib/wedding/photos.json. Those URLs are deliberately available to gallery visitors.

Each source has a 720-pixel WebP thumbnail, a 2200-pixel WebP viewing copy, and the unchanged original JPEG served as an attachment. Original photos remain untouched on the Desktop. Viewing copies are automatically oriented and carry no source EXIF metadata. Original downloads retain the photographer’s original file content and metadata.

The preparation script is apps/web/scripts/prepare-wedding-gallery.mjs. Run from apps/web with Node 22, --source=/absolute/path/to/photos, and --upload to publish assets. It uses the existing local Google Cloud application credentials with the Monosyth quota project. It checkpoints in /private/tmp/monosyth-wedding-assets and also resumes from the published manifest, preserving existing URLs. Use a new version prefix and deliberately update the manifest if replacing published source photos; do not overwrite immutable cached assets. The helper imports sharp and @google-cloud/storage supplied by the current locked Next.js/Firebase dependency tree.

## Validation

- All 250 source photo IDs matched the gallery manifest. All 750 hosted assets (thumbnail, viewing copy, original) returned successful availability checks.
- Production build and scoped gallery/config/script lint passed.
- Browser checks covered all-photo loading, chapter filters, opening and closing the viewer, next/previous navigation, Escape, restored keyboard focus, touch swipe, original download response and attachment filename, and indexing headers.
- No horizontal overflow at 320, 375, 390, 768, 1024, or 1440 pixels.
- Desktop, phone gallery, and phone viewer screenshots were visually reviewed.
- Full repository lint was attempted. It reports an existing react-hooks/immutability error in the unrelated bag-studio component, plus existing warnings; gallery files have no lint findings.

Publishing follows the repository’s normal main-branch Firebase App Hosting rollout.
