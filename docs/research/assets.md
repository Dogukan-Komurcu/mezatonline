# Mezatonline: mock media assets (sources, licenses, usage)

The data file is `docs/research/assets.json`. On 2026-10-26 every URL in it was checked with `curl`. Each one returned HTTP 200 with an `image/*` or `video/mp4` content type. Each video was also checked with `ffprobe` for width, height and duration.

## Counts

| Key | Count | Source |
|---|---|---|
| `categories.*` (25 keys) | 410 photos in total, 11 to 26 per key (see below) | Unsplash CDN |
| `avatars` | 100 (50 women and 50 men, interleaved) | randomuser.me |
| `videos` | 72 (40 portrait, 32 landscape), each 0.9 to 10.3 MB | Pexels (19), Mixkit (53) |
| `banners` | 18 wide crops (1200x500) | Unsplash CDN |

Photos per category key: pokemon 21, sports_cards 18, tcg_other 16, sneakers 14, womens_fashion 11, mens_fashion 12, bags 12, jewelry 14, watches 14, beauty 12, toys 15, video_games 14, electronics 12, coins 12, antiques 21, carpets 21, home_garden 12, plants 11, crystals 17, comics_manga 15, books 14, vintage 19, sports_memorabilia 17, food 26, handmade 22.

Notes on what some keys contain:
- **antiques:** gramophone, Turkish cezve, copper and brass pots, pocket watches, an antique shop, an old radio and a globe.
- **carpets:** Anatolian kilims and rugs, and piles of rugs.
- **food:** lokum, pistachio lokum, baklava, Turkish coffee (including coffee brewed in hot sand), Turkish tea, Mısır Çarşısı-style spice stalls, saffron, paprika and turmeric.
- **handmade:** İznik-style tiles, painted plates and bowls, Turkish mosaic lamps and pottery-wheel shots.
- **sports_cards:** real vintage NFL, NBA, MLB and NHL cards.
- **tcg_other:** Yu-Gi-Oh (Dark Magician), MTG and holo anime cards.
- **pokemon:** Charizard, Charmander, Giratina V, Pokémon card backs, pogs, figures and a Poké Ball.

## Sources and licenses

| Source | Host used | License (summary) | Hotlink |
|---|---|---|---|
| Unsplash | `images.unsplash.com/photo-<id>?…` | Unsplash License. Free for commercial and non-commercial use. No permission is needed and attribution is appreciated but not required. You may not sell unaltered copies, and you may not compile the photos into a competing stock service. | Yes. imgix CDN, and hotlinking is what Unsplash itself recommends. |
| Pexels | `videos.pexels.com/video-files/<id>/<id>-<rendition>.mp4`, `images.pexels.com/videos/<id>/…` | Pexels License. Free to use and no attribution required. Do not sell unaltered copies, and do not show identifiable people in a bad light. | Yes. Byte-range requests work: a ranged GET returned HTTP 206. |
| Mixkit (Envato) | `assets.mixkit.co/videos/<id>/<id>-720.mp4`, `…/<id>-thumb-720-0.jpg` | Mixkit Stock Video Free License. Commercial and personal use, no attribution, no standalone redistribution. | Yes. Served through CloudFront. The `content-disposition: attachment` header has no effect on AVPlayer, ExoPlayer or expo-video. |
| randomuser.me | `randomuser.me/api/portraits/{men,women}/{0..49}.jpg` | Random User Generator, a free placeholder-portrait service for prototypes. Use these only as placeholders, never as real seller identities. | Yes. Images are 128x128 JPEG, 2 to 6 KB each. |

Unsplash+ (`plus.unsplash.com/premium_photo-*`) URLs are excluded because they are paid. Two images.unsplash.com IDs that returned 404 (iStock-sponsored results) were also removed.

## URL patterns and tips

- **Product photo:** `https://images.unsplash.com/photo-<id>?w=800&q=80&auto=format&fit=crop`.
  - For a square thumbnail, change it to `?w=400&h=400&fit=crop&q=70&auto=format`.
  - For a 3:4 show card, use `w=600&h=800`.
  - For 2x/3x density, use the `dpr=2` parameter.
- **`auto=format`:** this parameter serves WebP or AVIF depending on the request's `Accept` header, and JPEG to curl. Use `expo-image`, which handles AVIF and WebP on iOS and Android and caches to disk. If plain `<Image>` has problems with a format, add `fm=jpg` to force JPEG.
- **Banners:** the source photos are all landscape (or wide) and are center-cropped server-side to 1200x500 (`w=1200&h=500&fit=crop`). Change `h=` for other aspect ratios, for example `h=675` for 16:9.
- **Video fields:**
  - Each `videos[]` entry carries `url, topic, category, portrait, sizeMB, width, height, durationSec, poster, source, license`.
  - Portrait clips are listed first.
  - Pexels portrait clips are 720x1280 (9:16) or 720x1366 (a slightly taller 0.53 ratio). Use `contentFit="cover"` in `expo-video`'s `VideoView` for full-bleed playback in a live room.
  - `poster` is a thumbnail you can show while the video loads:
    - Mixkit: a 720p JPEG.
    - Pexels: `pexels-photo-<id>.jpeg?…&w=720`.
    - For 6 Pexels clips (6612519, 6956639, 6995100, 6995104, 8087083, 8715506) the poster falls back to `pictures/preview-0.jpeg`, a tiny 5 KB image. Treat it as a blur placeholder only.
- **Other Pexels renditions:** they exist at the same path with a different suffix. The lightest options are `sd_360_640_<fps>fps`, `sd_540_960_<fps>fps` and `sd_506_960_<fps>fps` (for the 1366-tall series), which suit the small looping previews on Home show cards. Mixkit also has a `-360.mp4` version of every clip.

## Best videos for the "live show" look

- **Pexels live-selling series (portrait, seller talking to the camera):**
  - 7668407 (live selling)
  - 7679833 (woman showcasing merchandise)
  - 7680109 (man showcasing shoes)
  - 7679426 (clothes rack)
  - 8715506 (man with a briefcase of jewelry for sale)
  - 7287512 (product shoot)
- **Jewelry:** 8855209 (gold necklaces), 8844354 (rotating earrings), 10648315 (bracelets), and Mixkit 50782, 20877, 51649 and 34213.
- **Unboxing and shipping:** 6995100, 6956639, 6612519, 7253845, and Mixkit 42134, 42137, 42135 and 42164.
- **Cards:** 8751462 and 3693458 (deck in hand), Mixkit 5240. Free libraries do not have true Pokémon or sports-card pack-opening clips, so pair these clips with the card photos from `pokemon`, `sports_cards` and `tcg_other`.
- **Sneakers:** 8738293 (sneakers on a stand), 7680109, and Mixkit 34278, 12806 and 15059.
- **Beauty "seller on cam":** Mixkit 34478 (makeup tutorial recorded on a phone), 34483, 39678 and 40556.
- **Turkish or bazaar feel:** Mixkit 4178 (bazaar timelapse), 4147 (antiques market), 48329 (antique record player) and 39836 (pocket watch).

## Re-verifying

```bash
python3 -c "import json;d=json.load(open('docs/research/assets.json'));[print(u) for v in d['categories'].values() for u in v];[print(u) for u in d['avatars']+d['banners']];[print(v['url']) for v in d['videos']]" \
 | xargs -P 16 -I{} curl -s -o /dev/null -w "%{http_code} %{content_type} {}\n" -r 0-0 {} | grep -v -E "^(200|206) (image|video)/"
```
No output means every URL is still live.

## Fallback sources (not used, but they work without an API key)

- **Openverse API:** `https://api.openverse.org/v1/images/?q=<q>&license_type=commercial` returns CC-licensed Flickr and Wikimedia images with attribution strings. It is useful for very specific Turkish items such as "İznik çini" or "gramofon". CC BY images need the credit line shown in the app.
- **Mixkit tag pages:** `https://mixkit.co/free-stock-video/<tag>/` are plain HTML, and each clip's ID can be parsed from `assets.mixkit.co/videos/<id>/`.
