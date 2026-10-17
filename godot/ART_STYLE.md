# Kingsgaard Art Style Guide

Target look: stylized 3D like a 3D animated film. Reference mix for landscapes:
Fortnite (chunky readable shapes, clean stylized materials, warm lighting) +
Genshin Impact (bright saturated colour, soft gradients, atmospheric depth).
Use these as STYLE references only. Never copy their assets.

The look sits between two failure modes:
- TOO DRAWN (avoid): outlines/ink lines, hard cel-shading steps, brushstroke or
  hatching textures, black shadows, comic-book look.
- TOO BUBBLY (avoid): everything rounded/blobby, no flat planes, pastel toy look,
  plastic shine, low contrast.

## 1. Shapes
- Simplified, slightly exaggerated real-world shapes. Big readable silhouettes first,
  then medium detail, then small detail (big > medium > small hierarchy).
- Mix of flat planes and soft bevels: rocks are chunky with flat faces and softened
  edges, never perfect spheres and never razor-sharp.
- Bevel size: small relative to object (~5–15%). Edges catch soft highlights.
- Organic things (trees, bushes) = clumped rounded masses with clear shape, not
  noisy individual leaves and not single blobs.
- Avoid repetition: vary size, proportion, rotation. Avoid grids and evenly spaced rows.

## 2. Materials & Surfaces
- Stylized PBR: real 3D lighting on simplified materials. No photoreal textures.
- Smooth colour gradients across surfaces (e.g. lighter tops, darker bottoms),
  plus subtle large-scale colour variation. Low-contrast, soft surface detail.
- No outlines, no ink lines, no hatching, no blotchy/camouflage noise.
- Use triplanar mapping on terrain and rocks. No stretched textures anywhere.
- Shared materials: all rock uses one rock material, all dirt one dirt material, etc.
  Consistency across assets matters more than any single asset looking great.

## 3. Colour
- Bright and saturated but natural, never neon. Grass: fresh warm green.
  Rock: warm tan/sand. Dirt: muted dusty brown. Water: clear turquoise → teal.
- Warm light, cool shadows: lit areas lean warm (yellow/orange), shadows lean
  cool (blue/purple) or warm-dark for rock crevices.
- Shadows are never black. Darkest values ~40–60% of the base colour, tinted.

## 4. Lighting & Atmosphere
- Warm directional sun, slightly side-on so shape and depth read.
- Cool sky/hemisphere fill light so shadowed areas stay readable.
- Soft shadows (soft shadow maps), subtle ambient occlusion in crevices and contact
  points (tinted, never black).
- Atmospheric depth: soft distance fog/haze tinted toward the sky colour, so far
  objects get lighter and bluer. Gradient sky with soft stylized clouds.
- Optional subtle bloom on bright highlights and water. Never strong glow.

## 5. Detail Density
- More detail near the player, simpler with distance.
- Ground clutter (grass tufts, flowers, pebbles) in natural clusters, not even spread.
- Transitions are always blended: grass ↔ rock, grass ↔ dirt, ground ↔ water.
  No hard lines where materials meet. Objects are embedded in the ground, never floating.

## 6. Self-check before showing any result
Answer these honestly and fix anything that fails:
1. Does anything have outlines, hard cel steps or black shadows? (too drawn)
2. Is anything blobby, pastel or plastic-looking? (too bubbly)
3. Any stretched textures, floating objects, hard material borders or grid patterns?
4. Does it look like it belongs in the same world as existing assets?
5. Would it fit in a 3D animated film landscape?
