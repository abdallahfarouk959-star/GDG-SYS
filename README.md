# GDGoC Learn · AAST Aswan

A responsive learning portal based on the supplied four-screen reference, refined with Google Sans, official Material Symbols Rounded, and Google Material Web controls. The shared theme uses Google's blue and neutral palette, pill navigation and buttons, clean surfaces, and readable type sizes.

## Run locally

Requires Node.js 20 or newer. No dependency installation is needed.

```sh
npm start
```

Open **http://127.0.0.1:3100**. To use another port, run `npm start -- --port 3200`.

```sh
npm test
npm run build
npm run preview -- --port 3200
```

`dist/` is the static build. Serve it with an HTTP server. Opening `index.html` directly as a `file://` URL does not support JavaScript module loading.

## Screens and behavior

- **Dashboard:** certificate progress, XP breakdown, resume learning, next task.
- **Learning Tracks:** five tracks; follow tracks and continue the HTML & CSS workshop.
- **My Sessions:** six lessons, completion tracking with a properly spaced 40px checkbox target, a playable/pausable guided slide walkthrough, a sandboxed HTML/CSS playground, references, and a downloadable starter. The lesson footer stays inside the content card and stacks on narrow layouts.
- **Tasks:** combined status/track filters, task details, URL validation, and local project submissions.
- **XP & Badges:** XP breakdown and badge collection.
- **Certificate:** progress and requirement details, with the certificate locked pending completion and mentor approval.

Progress, followed tracks, and project submissions persist in `localStorage` on the same browser and origin. The sample season starts with 620 XP, 3 of 6 lessons, and the tasks shown in the reference. A newly completed lesson adds 20 activity XP. Submitted projects do not receive XP before approval.

This is a local frontend with sample learner data. Authentication, actual session videos, mentor review, notifications from a server, and verified certificate issuance require a backend. The Video tab currently contains an original guided slideshow rather than a recorded session.

## Google Material Web

Follows the official [Material Web quick start](https://github.com/material-components/material-web/blob/main/docs/quick-start.md), using the supported CDN/import-map setup. Material Web **2.4.1** is pinned in `index.html` and loaded through the guide's `all.js` entry point. The app uses:

Buttons, icon buttons, tabs, filter chips, checkbox, linear progress, outlined select, dialog, and outlined text field. Google Sans is explicitly applied to the document and Material typography tokens, with a sans-serif fallback. Task filters use wrapping Material chips so all statuses remain accessible on narrow screens.

**Internet access is needed** for Material Web from `esm.run` and Google Sans from Google Fonts. Fonts have an Arial/sans-serif fallback. All 56 Material Symbols are inline SVGs included locally; they do not require a font request, image masks, or network access. Their editable sources, provenance, and Apache-2.0 license are in `public/assets/icons/`.

No package installation is required for the development server, tests, or static build. The supplied environment blocked npm registry access, so this version uses the guide's CDN path. For an offline or bundled deployment, install `@material/web@2.4.1` and resolve the existing bare imports using a bundler, as described in the quick start.

## Editable source

Brand artwork is now sourced from `GDGoC_LogoPack/GDGoC_AAST_Aswan_Logo_Pack`. The sidebar, mobile header, loading state, gallery, favicon, touch icon, and certificate preview use its supplied vectors or avatar. The original paths, outlined lettering, proportions, and brand colors are preserved. “Learn” is a separate product label.

Run `npm run brand:sync` after updating the supplied kit, then `npm run build`. Light, dark, white, black, blue, and stacked variants are in `public/assets/brand/`, along with `sources.json` and the kit's original usage notes. The package describes these as reconstructed assets rather than official master brand files.

- `src/google.css`: final Google Sans typography, Material theme, refined controls, and responsive layout fixes.
- `src/styles.css`: base screen structure and reduced-motion support.
- `src/icons.js`: generated inline Google Material Symbols; regenerated with `npm run assets:refresh`.
- `src/app.js`: screens and interactions.
- `src/state.js`: sample content and progress calculations.
- `design/tokens.json`: shared visual tokens.
- `public/assets/`: editable artwork, Material Symbols, supplied GDGoC brand variants, and certificate illustration.
- `assets-gallery.html`: refreshed searchable Material Web asset gallery. Run `npm run assets:refresh` after editing the vector library.
- `screenshots/original-concept-reference.png`: supplied design reference.

The portal adapts to desktop, tablet, and phone layouts and includes keyboard focus, a skip link, labeled controls, mobile navigation, and live status messages.

Validation: state/icon tests, static build, SVG manifest verification, and stylesheet parsing pass. Browser verification stopped because the computer-use tool could not verify the current browser URL; the final visual result has not been screenshot-verified.

## 📊 Final Attendance Analytics & Master Dataset

- **Interactive Power BI Dashboard**: Located in [`dashboard/`](dashboard/) ([`dashboard/index.html`](dashboard/index.html)). Open directly in any modern browser to view executive metrics, chronological timeline, commitment rates, cross-track engagement matrix, gender loyalty, university cohorts, and attendee intelligence search.
- **Audited Master Dataset**: Located in [`data/`](data/) ([`data/Master_Attendance_final.xlsx`](data/Master_Attendance_final.xlsx)), verified across all 155 participants and 5 technical workshops, with the accompanying 10-point audit report in [`data/VERIFICATION_REPORT.md`](data/VERIFICATION_REPORT.md).
