# GT3 motion study

Static HTML/CSS/JavaScript with a scroll-controlled Blender render sequence of the reference-finished 2022 Porsche 911 GT3 (992). The authored, deployable site is `dist/`; no build service or external asset CDN is required.

Run `npm run dev`, then open http://127.0.0.1:5173. Run `npm run check` to validate JavaScript and local assets. Deploy the contents of `dist/` to a static host. Asset and decoder URLs are relative, including under a GitHub Pages repository path.

## Experience

- The approved front-view Blender poster appears immediately while the matching DRL-lit and final frames load. There is no switch to a different browser material treatment.
- The intro starts at 70% of the final car size and moves smoothly forward over 2.2 seconds. The final front view is 30% larger on desktop and 12% larger on mobile. This uses a scale animation of the reference render; the framing eases back into the existing orbit as scrolling begins.
- The intro opens near black with a dimmed car and medium-bright projector cores with cool optical bloom. The beams hold for 0.3 seconds, rise to full brightness over 0.45 seconds, hold the peak for 0.2 seconds, then soften over 3 seconds while the car and background gradually brighten to the normal page lighting. The four-point daytime running lights stay on. After the 4.15-second intro and a brief 0.12-second pause, the interface fades in gently over 2.2 seconds; the shared branding stays visible throughout. Skip intro and Escape exit immediately at the final car size and normal lighting; Replay headlights restarts the dark approach.
- Scrolling turns the car clockwise through 73 camera views spanning 140 degrees, blending adjacent frames, then moves the car into the smaller bordered card. A canvas snapshot replaces the animation there. Scrolling back resumes the sequence.
- Reduced-motion and data-saver preferences use the static poster without downloading the sequence. A failed load or 25-second timeout releases the intro and offers a retry. The page remains usable without JavaScript.
- The interface uses neutral black, white and gray, with a shared dark intro/hero background. Reserved scrollbar space keeps the car framing unchanged when intro scrolling unlocks.
- Mobile framing reserves a gap above the hero copy and below the second section's copy, so the car and its final holder do not overlap text on shorter phones.

## Assets and finish

`dist/assets/sequence/` and the opening poster are rendered from `Porsche_GT3_Paint_Headlights_v2.blend`: graphite clearcoat, carbon panels, bronze wheels, detailed lamps, GT3 rear badge and 4.0 engine-cover marking. The original Blender file remains separate. Its geometry, procedural materials, lighting and color management are preserved in these renders.

The poster and every sequence frame include the reference daytime running lights. A canvas high-beam bloom is aligned to the front projector positions and fades away after the intro, leaving the rendered DRLs on. The body finish and camera framing remain consistent throughout. This is a pre-rendered camera path, not a live WebGL model or freely orbitable view. The previous GLB and Three.js implementation remain available in the repository but are not loaded by the page.

Edit `dist/assets/model.json` for the poster, frame directory and frame count. Intro timing and scroll ranges are in `dist/app.js`; frame loading and drawing are in `dist/reference-viewer.js`; responsive placement is in `dist/motion.css` and `app.js`.

The renderer prefetches compressed WebP frames with three requests at a time, retains at most ten decoded frames, caps pixel ratio and draws on changes. It pauses offscreen/in hidden tabs and stops rendering when docked. Missing intermediate frames retain the nearest available view and are retried on demand.

To reproduce the assets, run Blender in background mode with the master file and `scripts/render-sequence.py`, then run `scripts/encode-sequence.py` with Python and Pillow. The renderer never saves changes to the master `.blend`.

Model attribution and license links are in `dist/assets/CREDITS.md` and linked from the footer.
