# Modular Bag Studio

## Private product and mobile roadmap

Status: early product foundation  
Audience: new and intermediate sewers  
Working product phrase: **One bag grammar. Many useful constructions.**

This document is planning material for the private Monosyth workspace. It is not website copy and should not be published with the app.

## Product thesis

Most tote, zipper-tote, project-bag, and related tutorials are variations of the same underlying construction system. Modular Bag Studio should teach and generate that system instead of becoming a disconnected catalog of patterns.

The reusable bag grammar is:

> finished goal → body → depth system → panel construction → support → attachments → closure → lining → assembly sequence

Every saved project should be a parameterized recipe made from these modules. The most important promise is trustworthy translation among:

- what the sewer wants the finished bag to be;
- what pieces must be cut;
- where the stitch lines and seam allowances go;
- how flat pieces become a three-dimensional bag; and
- what order the construction steps must follow.

Arbitrary vector freedom is a later feature. A drawing tool that can create an attractive but unsewable shape would be less useful than a constrained editor that explains and validates the construction.

## Product principles

1. **Lead with the outcome.** Ask for finished width, height, depth, and intended use before asking for pattern-engineering decisions.
2. **Keep cut, stitch, and finished geometry distinct.** Use a consistent visual language everywhere and never let “2½ inch square” silently change meaning.
3. **Teach at the point of consequence.** Explain the seam allowance beside the measurement it changes; show “open the zipper” immediately before the shell is closed.
4. **Use compatible defaults.** Beginner mode keeps symmetry, matching outer/lining corner geometry, suitable clearances, and proven construction sequences locked together.
5. **Reveal complexity progressively.** Intermediate mode can unlock independent edges, alternate methods, custom allowances, directional layouts, and more complex closures.
6. **Generate dependencies, not generic prose.** A zipper, pocket, handle, or gusset changes both pattern pieces and assembly order.
7. **State uncertainty honestly.** Use “expected finished size” when foam, heavy seams, quilting, or turn-of-cloth can change the result.
8. **Keep user work private by default.** Early named saves and the working draft remain local to the signed-in browser profile. Sharing is a later, explicit feature.

## The bag grammar

### Body

- Primary intent: finished width, height, depth, and top-opening width.
- First constructions: two-panel body and a folded one-piece body.
- Later: front/back with separate base or full gusset.
- First shapes: rectangle and symmetric taper.
- Later: curves, shaped bases, round corners, and controlled vector nodes.

### Bottom and depth

- Flat, boxed corners, and a separate base/gusset are separate construction systems.
- A boxed-corner control should update the flat pattern, cutout, finished footprint, and 3D result together.
- Outer and lining geometry must remain compatible, with lining ease stated rather than hidden.

### Panel construction

- Solid fabric.
- Contrast bottom.
- Vertical or horizontal strips.
- Patchwork/block grid.
- Quilted or pieced slab built oversize, then trimmed.
- Per-piece direction, grain, nap, mirroring, and matching requirements.
- Piecing seam allowance remains separate from bag-construction seam allowance.

### Structure and lining

Ask for the desired feel before naming a product:

- soft or draped;
- lightly structured;
- crisp; or
- stand-up/foam-supported.

Then recommend compatible interfacing, fleece, foam, quilting, lining method, turning gap, and bulk warnings. Encourage a fused or quilted scrap test instead of promising identical results across fabrics.

### Handles and attachments

- Material, finished width, drop, center inset, attachment depth, and reinforcement.
- Placement marks on both flat panels before shell assembly.
- Validate symmetry, side-seam and corner clearance, pocket conflicts, contrast joins, and piecing seams.
- Later: crossbody straps, tabs, D-rings, sliders, swivel hooks, and load-path validation.

### Pockets

- First: exterior/interior patch pocket and divided slip pocket.
- Separate usable opening, finished size, and cut size.
- Reserve clearance from top joins, side seams, boxed corners, contrast joins, handles, and closures.
- Later: zipper, welt, mesh, bottle, and dimensional pockets.

### Closures

- Open rim.
- Direct top zipper.
- Side zipper.
- Recessed zipper.
- Zipper gusset.
- Later: drawstring, magnetic snap, flap, roll top, and bound opening.

The app should distinguish zipper opening or tooth length from total tape length, validate slider clearance, show zipper-sandwich orientation, and insert the zipper-open checkpoint before closing the shell.

### Generated sewing sequence

The base dependency order is:

1. Label, interface, quilt, and trim pieces.
2. Add embellishment and pockets.
3. Mark and attach handles, tabs, reinforcement, and anchors.
4. Build the closure subassembly.
5. Assemble the exterior.
6. Assemble the lining and leave the required turning opening.
7. Form corners or attach gussets.
8. Join exterior and lining at the rim or closure.
9. Turn, press, and close the lining opening.
10. Topstitch and add final removable hardware.

Each selected module should contribute prerequisites, actions, warnings, and measurable checkpoints to this graph. The app should not reuse one static instruction list for every bag.

## Beginner and intermediate experience

### Beginner path

1. Choose a goal: first tote, zipper pouch, structured tote, or custom.
2. Choose the finished size with a live result and familiar “what fits” examples.
3. Choose depth while the flat corner transformation and finished footprint animate together.
4. Choose feel: soft, lightly structured, or stand-up.
5. Add one feature at a time: handles, pocket, closure.
6. Review a labeled fabric map with grain, right/wrong side, quantities, cut line, stitch line, and finished line.
7. Sew in a guided mode with one operation and one checkpoint per card.

The result should always appear first—“Cut 2 outer panels at …”—with an optional **Explain the math** expansion.

### Intermediate path

- Start from a proven recipe and duplicate/rescale it.
- Unlock independent top insets or alternate construction methods.
- Change seam allowances with all dependent pieces redrafted.
- Use directional and mixed-fabric layouts.
- Add more complex closures, support, pockets, and hardware.
- Compare the designed size with the measured result from a completed make.

### Learning ladder

1. Cut size versus finished size, seam allowance, right/wrong side, and grain.
2. Open lined tote with handles.
3. Boxed corners and depth.
4. Patch pocket, contrast bottom, and pieced panels.
5. Zipper-sandwich pouch.
6. Direct top-zipper tote.
7. Recessed zipper and zipper gusset.
8. Adjustable straps, hardware, advanced pockets, and separate gussets.

## Mistakes the app should actively prevent

- Mixing finished and cut dimensions.
- Changing an allowance without redrafting dependent pieces.
- Using the piecing allowance as the bag-construction allowance.
- Treating every boxed-corner method as equivalent.
- Cutting unmatched outer and lining corner geometry.
- Rotating directional or napped pieces only because they fit a fabric map.
- Cutting a pieced or quilted slab exactly to final size before distortion occurs.
- Placing handles or pockets inside seam, corner, contrast, or closure zones.
- Attaching straps too late, asymmetrically, twisted, or without reinforcement.
- Treating zipper tape length as zipper-opening length.
- Crowding zipper teeth or slider travel with lining or topstitching.
- Closing a shell with the zipper shut.
- Forgetting or undersizing a turning opening, especially with foam.
- Omitting centers, notches, orientation marks, and piece labels.
- Creating an impractical layer stack for a domestic machine.
- Underestimating fabric by ignoring direction, matching, shrinkage, handles, or trim margin.

High-value stop-and-verify cards should compare matching outer/lining pieces, check mirrored placement, measure trimmed slabs, test the zipper, compare top circumferences, and confirm both the open zipper and lining gap before the shell is closed.

## Product phases

### Phase 1 — trustworthy private studio

- Modular Bag Studio name and permanent `/app/bag-studio` route.
- Finished-size and cut-size editing with explicit overlays.
- Boxed-corner depth and symmetric taper.
- Solid, contrast, strips, and block-grid outer panels.
- Independent piecing and construction allowances.
- Tote handles with placement and reinforcement checks.
- Current closure set, with construction warnings where the implementation is still conceptual.
- Live 2D pattern, full-orbit vector outcome, cut list, fabric map, and fat-quarter planning.
- Automatic working-draft restoration.
- Named local saves, duplicate, update, search, and print/SVG export.
- Tested presets and calculation tests.

### Phase 2 — beginner-guided construction

- Goal-first project chooser and “what fits” size examples.
- Beginner and intermediate modes.
- Cut/stitch/finished overlay legend across every diagram.
- Desired-structure selector with material guidance.
- Patch and divided-slip pocket modules.
- Dependency-generated sewing cards with checkpoints.
- Per-piece cut checklist and resume position.
- Materials, notions, substitutions, and machine-bulk advisories.
- A completed “made version” record with actual size, materials, photo, and notes.

### Phase 3 — installable offline web app

- Web app manifest, icons, install prompt, and carefully scoped service worker.
- Move projects from `localStorage` to versioned IndexedDB.
- Offline reopening, autosave recovery, import/export, and storage-health tools.
- Extract the sewing calculations, project schema, migrations, and vector scene into pure TypeScript packages with no React or browser dependency.
- Add renderer-neutral geometry tests and golden project fixtures.

### Phase 4 — optional account sync

- Firestore as authenticated synchronization, not the only local store.
- Owner-only security rules and project quotas.
- Local operation outbox, revision checks, conflict-copy behavior, and visible sync status.
- Sync named projects, made versions, photos, and progress across devices.
- No public sharing by default.

### Phase 5 — native phone app

- Add an Expo/React Native sibling after the PWA and shared core are stable.
- Rebuild screens with mobile-native components rather than trying to reuse DOM/CSS UI.
- Use Expo Router, SQLite, and React Native SVG.
- Share sewing math, project schemas, migrations, dependency sequencing, scene geometry, sync rules, and test fixtures.
- Adopt Skia or GL only if measured rendering needs exceed SVG.
- Use phone-specific strengths: camera documentation, photographed fabric swatches, step checkpoints, notifications only when useful, and one-handed guided sewing mode.

### Later construction families

- The true boxy-bag structure as its own body/construction recipe.
- Separate side and base gussets.
- Curves, shaped bases, and round corners.
- Multiple recessed-zipper and zipper-gusset end treatments.
- Crossbody hardware and adjustable straps.
- Advanced pockets and closures.
- Piping, binding, vinyl/leather handling, feet, and bottom inserts.
- Projector calibration, tiled Letter/A4 PDFs, SVG, and DXF.
- Material-aware nesting and yardage optimization.
- Controlled custom vector nodes and asymmetry after construction validation exists.
- Public community patterns only with versioning, tested status, attribution, moderation, and a clear distinction between verified recipes and experiments.

## Technical architecture

### PWA first, native second

The current Next.js app should become an installable PWA before a second mobile codebase is created. This preserves the working interface and makes offline/local product work immediately useful. The official [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps) covers the manifest and service-worker path.

When native distribution or device features justify it, add an Expo/React Native app. [Expo Router](https://docs.expo.dev/router/introduction/) provides the native navigation model and [EAS Build](https://docs.expo.dev/build/introduction/) produces iOS and Android builds.

### Share the domain, not the DOM

Create framework-independent packages for:

- sewing calculations and validation;
- versioned project data and migrations;
- pattern and cut-list generation;
- construction dependency graphs;
- renderer-neutral 2D/3D scene geometry;
- import/export and sync operations; and
- deterministic fixtures and tests.

The web can render the scene with browser SVG; native can render the same scene through [React Native SVG](https://docs.expo.dev/versions/latest/sdk/svg/). Platform screens and controls remain separate where that produces a better experience.

### Local-first storage

- Current private prototype: user-scoped `localStorage` with a versioned snapshot.
- PWA: [IndexedDB](https://www.w3.org/TR/IndexedDB-3/) with explicit upgrades.
- Native: [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) with matching repository behavior.
- Cloud later: Firestore sync plus an explicit outbox and revisions.

Store canonical inputs, not derived cut lists or preview polygons. Keep separate versions for the project schema, sewing calculations, and local database. Firestore is schemaless, so versioning belongs in the records; see the [Firestore data model](https://firebase.google.com/docs/firestore/data-model).

Firestore offline caching uses last-write-wins behavior and offline transactions fail, so simultaneous edits need deliberate revision and conflict-copy rules rather than assumed safety: [offline behavior](https://firebase.google.com/docs/firestore/manage-data/enable-offline) and [transactions](https://firebase.google.com/docs/firestore/manage-data/transactions).

The same Firebase project can support web and mobile identity. Expo recommends the Firebase JavaScript SDK for Auth, Firestore, and Storage unless native-only Firebase services become necessary: [Expo Firebase guide](https://docs.expo.dev/guides/using-firebase/).

Do not convert the repository to a monorepo or create a native app yet. Do that as a deliberate milestone after the shared core and project format are stable, following [Expo monorepo guidance](https://docs.expo.dev/guides/monorepos/) and [Firebase App Hosting monorepo guidance](https://firebase.google.com/docs/app-hosting/monorepos).

## Research grounding

The following established sewing references support the proposed construction rules:

- [Janome quilted project bag](https://www.janome.com/inspire/projects/four-fabric-quilted-project-bag/): zipper-open checkpoint, turning gap, boxed-corner alignment, reinforcement, trimming, and turning.
- [Janome zipper pouch](https://www.janome.com/inspire/projects/zippy-pouch/): exterior–zipper–lining sandwich, half-open zipper, lining opening, and boxed-corner sequence.
- [Janome simple quilted tote](https://www.janome.com/inspire/projects/simple-quilted-tote/): matching outer/lining cutouts, handle placement before lining, turning gap, and topstitching.
- [Janome denim zipper pouch](https://www.janome.com/inspire/projects/upcycled-denim-zipper-pouch/): pockets before shell assembly and zipper-area topstitching to reduce catching.
- [ByAnnie Soft and Stable](https://www.byannie.com/blog/byannie-s-blog-1/spotlight-soft-and-stable-110): foam as a structure choice that changes whether a bag holds its shape.
- [ByAnnie Pocket Packers instructions](https://www.byannie.com/web/content/slide.slide/1121/binary_content?download=true): quilt an oversize body/support stack and trim accurately afterward.
- [ByAnnie Pencil Case instructions](https://www.byannie.com/web/content/slide.slide/983/binary_content?download=true): use a zipper longer than the body and trim after installation.
- [Pellon Fuse-N-Shape guidance](https://www.pellonprojects.com/wp-content/uploads/2020/07/731.pdf): choose support by desired structure and test fusion on scrap.
- [Sewing and Craft Alliance cutting guidance](https://www.sewing.org/html/cutting.html): grain-aware layouts and consistent orientation for one-way prints or nap.
- [Sailrite Box-X guide](https://www.sailrite.com/How-to-Sew-a-Box-X-Stitch): explicit handle and strap reinforcement.

## Near-term decision

Keep the current app focused on reliable pattern math, clearer teaching, named projects, and the shared construction model. Build the installable/offline foundation next. Do not start a separate native app until the versioned project schema, renderer-neutral geometry, and guided construction dependencies are stable enough to share.
