# Asset inventory

**81 individual editable SVG assets**, plus a supplied PNG touch icon and the JSON manifest. The 56 interface icons are official Google Material Symbols Rounded, licensed under Apache-2.0. Brand artwork comes from the supplied `GDGoC_LogoPack`. Other artwork is editable vector concept artwork. Run `npm run assets:refresh` after editing SVGs, or `npm run brand:sync` after updating the logo pack.

## Folders

### `avatars/` (1 assets)

- `assets/avatars/student-placeholder.svg`

### `badges/` (4 assets)

- `assets/badges/challenge-complete.svg`
- `assets/badges/community-helper.svg`
- `assets/badges/consistent-builder.svg`
- `assets/badges/first-step.svg`

### `brand/` (9 SVG assets + PNG touch icon)

- `assets/brand/gdgoc-learn-lockup-white.svg`
- `assets/brand/gdgoc-learn-lockup.svg`
- `assets/brand/gdgoc-learn-mark.svg`
- `assets/brand/gdgoc-mark-white.svg`
- `assets/brand/gdgoc-mark-black.svg`
- `assets/brand/gdgoc-mark-blue.svg`
- `assets/brand/gdgoc-full-dark.svg`
- `assets/brand/gdgoc-stacked-light.svg`
- `assets/brand/gdgoc-favicon.svg`
- `assets/brand/gdgoc-touch-icon.png`

The three `gdgoc-learn-*` filenames are compatibility aliases for the kit's four-color mark, full light logo, and full white logo. Source vectors are copied unchanged. The favicon centers the original mark on a square canvas. The certificate embeds the kit's full light logo as vector paths. `sources.json` maps files to their originals; `LOGO-PACK-README.md` preserves the supplied usage notes.

### `icons/` (56 assets)

- `assets/icons/arrow-right.svg`
- `assets/icons/arrow-up-right.svg`
- `assets/icons/award.svg`
- `assets/icons/bell.svg`
- `assets/icons/book.svg`
- `assets/icons/brain.svg`
- `assets/icons/calendar-check.svg`
- `assets/icons/calendar.svg`
- `assets/icons/chart.svg`
- `assets/icons/check-circle.svg`
- `assets/icons/check-square.svg`
- `assets/icons/check.svg`
- `assets/icons/chevron-down.svg`
- `assets/icons/chevron-left.svg`
- `assets/icons/chevron-right.svg`
- `assets/icons/clipboard.svg`
- `assets/icons/clock.svg`
- `assets/icons/close.svg`
- `assets/icons/code.svg`
- `assets/icons/database.svg`
- `assets/icons/edit.svg`
- `assets/icons/external.svg`
- `assets/icons/eye.svg`
- `assets/icons/file-text.svg`
- `assets/icons/filter.svg`
- `assets/icons/flag.svg`
- `assets/icons/flame.svg`
- `assets/icons/github.svg`
- `assets/icons/grid.svg`
- `assets/icons/help.svg`
- `assets/icons/home.svg`
- `assets/icons/layers.svg`
- `assets/icons/lightbulb.svg`
- `assets/icons/link.svg`
- `assets/icons/list-check.svg`
- `assets/icons/lock.svg`
- `assets/icons/logout.svg`
- `assets/icons/mail.svg`
- `assets/icons/menu.svg`
- `assets/icons/monitor.svg`
- `assets/icons/paperclip.svg`
- `assets/icons/play.svg`
- `assets/icons/plus.svg`
- `assets/icons/qr.svg`
- `assets/icons/refresh.svg`
- `assets/icons/search.svg`
- `assets/icons/settings.svg`
- `assets/icons/shield.svg`
- `assets/icons/sparkles.svg`
- `assets/icons/star.svg`
- `assets/icons/terminal.svg`
- `assets/icons/trophy.svg`
- `assets/icons/upload.svg`
- `assets/icons/user.svg`
- `assets/icons/users.svg`
- `assets/icons/video.svg`

### `illustrations/` (6 assets)

- `assets/illustrations/certificate-hero.svg`
- `assets/illustrations/certificate-locked.svg`
- `assets/illustrations/empty-tasks.svg`
- `assets/illustrations/session-banner.svg`
- `assets/illustrations/season-certificate.svg`
- `assets/illustrations/video-placeholder.svg`

### `tracks/` (5 assets)

- `assets/tracks/artificial-intelligence.svg`
- `assets/tracks/cybersecurity.svg`
- `assets/tracks/data-science.svg`
- `assets/tracks/software-engineering.svg`
- `assets/tracks/web-development.svg`

## Using assets

Files can be opened and edited in Figma, Illustrator, Inkscape, or any text editor. SVG files are standard vector source assets. E.g.:

```html
<img src="./public/assets/tracks/web-development.svg" alt="" />
<img src="./public/assets/brand/gdgoc-learn-lockup.svg" alt="GDGoC Learn" />
```

Navigation icons are both individual SVG files and inline SVGs generated into `src/icons.js`. They inherit `currentColor` and render without an icon font or CSS image masks. `src/google.css` defines the typography, Material theme, and responsive layouts. Logo variants preserve the supplied GDGoC kit artwork and proportions.

## What is intentionally not exported

- No proprietary fonts are bundled. Google Sans is loaded from Google Fonts under the Open Font License. Material Symbols are included under Apache-2.0; see `public/assets/icons/LICENSE.txt` and `sources.json`.
- No real student pictures, real session videos, PDFs, or certificates.
- No screenshot crops masquerading as usable design assets.
- The original mockup image is included under `screenshots/` for reference only.
