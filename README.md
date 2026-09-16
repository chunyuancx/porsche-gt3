# GT3 motion study

Static HTML/CSS/JavaScript with a local Three.js viewer and the reference-finished 2022 Porsche 911 GT3 (992). The authored, deployable site is `dist/`; no build service or model CDN is required.

Run `npm run dev`, then open http://127.0.0.1:5173. Run `npm run check` to validate JavaScript and local assets. Deploy the contents of `dist/` to a static host. Asset and decoder URLs are relative, including under a GitHub Pages repository path.

## Experience

- The front-view poster appears immediately while the 3 MB GLB loads and its shaders compile.
- Once ready, the car faces the visitor with its four-point headlights on. They hold for 1.5 seconds, fade over 0.7 seconds, then reveal the page. Skip intro and Escape exit immediately; Replay headlights restarts it.
- Scrolling rotates the car through about 140 degrees and moves it into the smaller bordered card. A canvas snapshot replaces the live view there. Scrolling back restores the same 3D car.
- Reduced-motion and data-saver preferences use the static poster without downloading the model. A failed load, lost graphics context, or 25-second timeout releases the intro and offers a retry. The page remains usable without JavaScript.

## Assets and finish

`dist/assets/gt3.glb` is exported from `Porsche_GT3_Paint_Headlights_v2.blend`: graphite clearcoat, carbon panels, bronze wheels, detailed lamps, GT3 rear badge and 4.0 engine-cover marking. The original Blender file remains separate. Draco compression and its matching Three.js 0.180.0 decoder are included locally.

The web viewer translates the Blender finish to browser PBR materials. A generated room environment supplies changing reflections; fine normal variation sits below the smooth clearcoat. Thin tinted covers replace expensive refractive glass. The sub-pixel LED ribs are represented by eight continuous guides at the original lamp positions during the front-facing intro. Geometry proportions are retained.

Edit `dist/assets/model.json` for the GLB path, front orientation and paint/LED material names. Intro timing and scroll ranges are in `dist/app.js`; camera fitting and lighting are in `dist/viewer.js`; responsive frame placement is in `dist/motion.css` and `app.js`.

The renderer caps pixel ratio, draws on changes, pauses offscreen/in hidden tabs and stops rendering when docked. Compression reduces transfer size but does not decimate the source geometry. Profile on target mobile hardware before a production launch.

Model attribution and license links are in `dist/assets/CREDITS.md` and linked from the footer.
