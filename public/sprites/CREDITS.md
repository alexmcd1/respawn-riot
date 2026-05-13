# Sprite asset credits

All assets here are CC0 / public-domain licensed and free for any use including
commercial. Originals are downloaded fresh; the files in this directory are
unmodified copies.

| File(s) | Source | License | Original creator |
|---|---|---|---|
| `kenney_tiles.png`, `kenney_backgrounds.png`, `kenney_characters.png` | [Kenney — Pixel Platformer](https://kenney.nl/assets/pixel-platformer) | CC0 (Public Domain) | Kenney (Asset Jesus) |
| `dino/*.png` | [OpenGameArt — Free Dino Sprites](https://opengameart.org/content/free-dino-sprites) | CC0 (Public Domain) | demching |

## Tilemap atlas notes

- Each Kenney tile is **18 × 18 px**.
- `kenney_tiles.png` is the full packed atlas (tiles + backgrounds + characters).
- `kenney_backgrounds.png` is just the backgrounds row (good for biome tiling).
- `kenney_characters.png` is just the characters row.

## Dino frames

- Source provides full Idle/Run/Jump/Walk/Dead sequences (10 frames each).
- This directory has a curated subset (2 idle, 3 run) to keep payload small.
- Drop the full `Idle (N).png` / `Run (N).png` files in if you want smoother
  animation.

## Adding new assets

1. Drop the PNG into `public/sprites/` (any subfolder).
2. Reference it from a Phaser scene's `preload()`:
   ```ts
   this.load.image('my_sprite', '/sprites/my_sprite.png')
   // or for a sprite sheet:
   this.load.spritesheet('my_anim', '/sprites/my_anim.png', { frameWidth: 18, frameHeight: 18 })
   ```
3. Use it in `create()`:
   ```ts
   this.add.image(x, y, 'my_sprite')
   ```
