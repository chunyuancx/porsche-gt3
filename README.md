# GT3 motion study

Lightweight static HTML/CSS/JavaScript with an optional, on-demand Three.js WebGL viewer. Run `npm run dev` and open http://127.0.0.1:5173. Run `npm run check` for syntax validation. Authored deployable files are in `dist/`.

The current experience uses a real photographic placeholder. It shrinks on scroll; real rotation becomes available only after supplying the car model. No GT3 model has been generated.

## Model handoff

Place a licensed GLB at `dist/assets/gt3.glb` and set `src` to `/assets/gt3.glb` in `dist/assets/model.json`. Set rotationY in radians to correct its initial orientation. Model is auto-centered and scaled. Export a standard uncompressed GLB with embedded textures; Draco/KTX2 compressed assets require adding the matching decoder first. Blender exports glTF 2.0 / GLB; it does not run in the browser.

Suggested starting budgets, to be validated on target devices: 2–5 MB GLB, 50–100k triangles, 1K textures on mobile, few materials. Remove hidden geometry and bake complex materials. Avoid production CAD meshes. The viewer caps pixel ratio, renders on scroll/resize only, pauses offscreen and in hidden tabs, and keeps a photo for loading failures, reduced motion and data saver. Actual performance must be profiled with the final model on real mobile and desktop hardware.

Provide the exact GT3 year/generation and 6–10 daylight reference photos: front, rear, both sides, front/rear three-quarter angles, wheels and wing. Same car/trim and consistent color. An existing accurate licensed model is generally preferable to image-to-3D for this subject. No Higgsfield subscription is required.
