# Luxe Fade Lounge

Website: https://kovoarts-rgb.github.io/luxe-fade-lounge/

Responsive static website with booking handled by Luxe Fade Lounge’s existing Square appointment flow.

## Publishing

GitHub Pages publishes the `main` branch from the repository root. Edit the HTML, CSS, JavaScript or images and commit to `main` to update the site. `.nojekyll` keeps the static files unchanged.

## Photography and design

The supplied brand logo, Anthony-at-work photo, signed case, and lounge photo retain their original source pixels. The black-hair photo is an edited derivative. The vintage chair and architectural backdrop are decorative generated images. Font license files are included in `assets/`.

## Chrome 3D hero

The hero uses a real beveled GLB model traced from the supplied logo, with 22 component meshes, 73,604 vertices, refined curves, 16-segment bevels and mirror-polished chrome (metalness 1, roughness 0.055). A local HDR reflection environment produces moving highlights. A single sticky galaxy backdrop with 310 stars and 42 animated sparkle points continues through the signed case and vintage chair section. `hero-3d.mjs` and `hero.css` control the presentation. `logo-interaction.mjs` provides pointer-captured, quaternion-based free rotation, bounded two-finger pinch zoom, reset and keyboard controls. Touch dragging is confined to the logo; the rest of the page scrolls normally. `assets/luxe-fade-logo.glb` is the standalone model.

Rendering pauses offscreen, in background tabs, and while dialogs are open. Reduced-motion preferences use a static scene. A chrome SVG fallback remains if WebGL or the model cannot load. Booking is independent of the decorative renderer.

The Three.js runtime is bundled locally; its MIT license is in `assets/three-license.txt`. To rebuild the model and runtime, run `npm install` then `npm run build:hero`. The original traced paths and build scripts are in `scripts/hero/`; updating the optional raster trace requires Python with Pillow and NumPy.
