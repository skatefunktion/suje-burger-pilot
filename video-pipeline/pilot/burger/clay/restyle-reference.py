"""Reference-locked clay review export; never used by the production queue.

Authoring dependencies: numpy, Pillow, opencv-python-headless==4.10.0.84.
Prepare source-frame image-edit jobs, then render their checked-in clay anchors:
  python3 restyle-reference.py prepare /path/to/reference.mp4 /path/to/work
  python3 restyle-reference.py render /path/to/reference.mp4 /path/to/work

The source supplies shot timing, optical-flow motion and its unchanged audio.
Clay anchor images supply the material; native Korean typesetting supplies text.
The original reference video is intentionally not bundled in the repository.
"""
import argparse
from functools import lru_cache
import hashlib
import json
from pathlib import Path
import subprocess

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
FILM = json.loads((HERE / 'reference-film.json').read_text())
N = FILM['contract']['frames']
FPS = FILM['contract']['fps']
SIDE = FILM['contract']['width']
FLOW_SIDE = 384
FONT = str(HERE / 'fonts' / 'Jua-Regular.ttf')

# Boxes refer to the supplied 1080-square film, not redesigned layouts.
# English is removed before image editing. The same boxes carry Korean later.
# Each entry is (Korean text, box, font size, optional original-ink colour).
LABELS = {
    'burger': [
        ('번', (865, 289, 1068, 338), 34),
        ('소고기 + 치즈', (45, 430, 354, 478), 34),
        ('양파', (865, 520, 1074, 567), 34),
        ('소고기 + 치즈', (45, 608, 354, 656), 34),
        ('양상추', (865, 700, 1075, 755), 34),
        ('토마토', (200, 786, 354, 832), 34),
        ('스프레드', (865, 865, 1076, 922), 32),
        ('번', (200, 961, 354, 1009), 34),
    ],
    'cheese': [
        ('1', (48, 266, 88, 305), 28),
        ('2', (558, 266, 598, 305), 28),
        ('3', (48, 650, 88, 692), 28),
        ('4', (558, 650, 598, 692), 28),
        ('우유', (775, 564, 873, 600), 30),
        ('커드', (223, 942, 358, 986), 30),
        ('체더치즈', (727, 940, 944, 987), 30),
    ],
    'pickles': [
        ('피클', (811, 436, 982, 481), 30),
        ('렐리시', (825, 738, 982, 787), 30),
    ],
    'flour': [('밀가루', (958, 967, 1057, 1009), 24)],
    'bakery': [('밀가루', (289, 850, 405, 902), 28)],
    'map': [
        ('밀', (394, 438, 469, 465), 24),
        ('토마토', (365, 500, 473, 529), 24),
        ('오이', (542, 588, 665, 618), 24),
        ('목장', (668, 660, 754, 690), 24),
        ('낙농장', (662, 727, 749, 756), 24),
        ('양상추', (378, 695, 474, 726), 24),
        ('제빵소', (616, 927, 715, 955), 23),
        ('패티', (765, 943, 858, 971), 23),
        ('점심', (801, 911, 898, 940), 24),
        ('로스앤젤레스', (528, 958, 674, 985), 22),
        ('샌디에이고', (676, 1023, 796, 1057), 22),
        ('북', (139, 824, 166, 854), 23),
        ('100마일', (228, 976, 340, 1006), 23),
    ],
    'restaurant': [('버거', (185, 370, 643, 467), 60)],
    'people': [
        ('목장주', (16, 809, 166, 856), 29),
        ('농부', (176, 809, 325, 856), 29),
        ('낙농가', (347, 809, 453, 856), 29),
        ('수확자', (480, 809, 599, 856), 29),
        ('제빵사', (630, 809, 752, 856), 29),
        ('운전기사', (771, 809, 898, 856), 28),
        ('요리사', (931, 809, 1065, 856), 29),
        ('꿀벌', (642, 435, 703, 467), 21),
    ],
    'signature': [('오퍼스', (849, 1010, 966, 1068), 30)],
}


def probe(source):
    result = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_streams', '-of', 'json', str(source)
    ]))
    video = next(s for s in result['streams'] if s['codec_type'] == 'video')
    assert (video['width'], video['height']) == (SIDE, SIDE), 'Expected the confirmed square reference'
    assert video['r_frame_rate'] == '24/1', 'Expected the original 24fps reference'
    assert int(video['nb_frames']) == N, 'Expected the complete original 1536-frame film'
    assert any(s['codec_type'] == 'audio' for s in result['streams']), 'Reference audio missing'
    return result


def shot_for(frame):
    return FILM['shots'][min(len(FILM['shots']) - 1, frame // 64)]


def caption_for(frame):
    return next(c for c in reversed(FILM['captions']) if frame >= c['start'])


def clear_text(image, shot):
    image = image.copy()
    height = 192 if shot['id'] == 'exploded-burger' else 238
    # The unlettered top margin supplies the exact night/day background colours.
    # Column-wise sampling retains the original diagonal dawn wipe, not a new card.
    strip = np.median(image[:22], axis=0).astype(np.uint8)
    image[:height] = strip[None, :, :]
    mask = np.zeros(image.shape[:2], np.uint8)
    for _, (x0, y0, x1, y1), _ in LABELS.get(shot.get('labels'), []):
        mask[y0:y1, x0:x1] = 255
    if mask.any():
        image = cv2.inpaint(image, mask, 5, cv2.INPAINT_TELEA)
    return image


def checked_source_hash(source):
    checksum = hashlib.sha256(source.read_bytes()).hexdigest()
    manifest = HERE / 'reference-assets' / 'manifest.json'
    if manifest.exists():
        assert checksum == json.loads(manifest.read_text())['source_sha256'], \
            'Reference differs from the film used to author these clay anchors'
    return checksum


def prepare(source, work):
    checksum = checked_source_hash(source)
    probe(source)
    work.mkdir(parents=True, exist_ok=True)
    refs = work / 'reference-frames'
    refs.mkdir(exist_ok=True)
    anchors = {f for shot in FILM['shots'] for f in shot['anchors']}
    frames = np.lib.format.open_memmap(work / 'source-proxy.npy', mode='w+',
        dtype=np.uint8, shape=(N, FLOW_SIDE, FLOW_SIDE, 3))
    cap = cv2.VideoCapture(str(source))
    ink = []
    for n in range(N):
        ok, image = cap.read()
        assert ok, f'Reference decode failed at frame {n}'
        frames[n] = cv2.resize(image, (FLOW_SIDE, FLOW_SIDE), interpolation=cv2.INTER_AREA)
        shot = shot_for(n)
        capdef = caption_for(n)
        # Measure the source's type-on timing; Korean is typeset separately.
        marker = image[45:105, 40:1040].astype(np.int16)
        red_mask = ((marker[:, :, 2] - marker[:, :, 1] > 30) &
                    (marker[:, :, 2] - marker[:, :, 0] > 25))
        # Extent follows writing progress without mistaking changing red-ink
        # density across night/day for unfinished characters.
        columns = np.flatnonzero(red_mask.any(axis=0))
        red = int(columns[-1]+1) if len(columns) else 0
        y0, y1 = (125, 238) if capdef['marker'] else (30, 192)
        body = image[y0:y1, 40:1040].astype(np.int16)
        bg = np.median(image[:20, 40:1040], axis=0)[None, :, :]
        count = (np.max(np.abs(body - bg), axis=2) > 95).sum()
        label_counts = []
        for _, (x0, yy0, x1, yy1), _ in LABELS.get(shot.get('labels'), []):
            patch = image[yy0:yy1, x0:x1].astype(np.int16)
            background = np.median(patch.reshape(-1, 3), axis=0)
            label_counts.append(int((np.max(np.abs(patch-background), axis=2) > 65).sum()))
        ink.append({'caption': int(count), 'marker': int(red), 'labels': label_counts})
        if n in anchors:
            cv2.imwrite(str(refs / f'{n:04d}.png'), clear_text(image, shot))
    cap.release()
    frames.flush()
    (work / 'source-ink.json').write_text(json.dumps(ink))
    jobs = []
    for shot in FILM['shots']:
        for frame in shot['anchors']:
            jobs.append({
                'frame': frame, 'shot': shot['id'], 'first': frame == shot['anchors'][0],
                'input': str(refs / f'{frame:04d}.png'),
                'output': str(work / f'clay-{frame:04d}.png'),
                'style': str(work / f"clay-{shot['anchors'][0]:04d}.png"),
                'subject': shot['subject'],
            })
    (work / 'generation-jobs.json').write_text(json.dumps(jobs, indent=2))
    (work / 'source-sha256.txt').write_text(checksum+'\n')
    print(f'Prepared {N} source frames, {len(FILM["shots"])} locked sections, {len(jobs)} image-edit jobs', flush=True)


@lru_cache(maxsize=64)
def font(size):
    return ImageFont.truetype(FONT, size)


def fit_font(text, maximum, width):
    size = maximum
    while size > 12 and max(font(size).getlength(line) for line in text.split('\n')) > width:
        size -= 1
    return font(size)


def ink_progress(ink, frame, end, field):
    start = caption_for(frame)['start']
    maximum = max(item[field] for item in ink[start:end])
    current = max(item[field] for item in ink[start:frame+1])
    return min(1, current / maximum) if maximum else 0


def type_text(text, progress):
    if progress >= .95:
        return text
    return text[:int(len(text) * min(1, progress * 1.03))]


def text_frame(bgr, frame, ink):
    shot = shot_for(frame)
    caption = caption_for(frame)
    following = [c['start'] for c in FILM['captions'] if c['start'] > frame]
    end = following[0] if following else N
    image = Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
    text = Image.new('L', image.size)
    draw = ImageDraw.Draw(text)
    shown = type_text(caption['text'], ink_progress(ink, frame, end, 'caption'))
    draw.multiline_text((60, 119 if caption['marker'] else 31), shown,
        font=fit_font(caption['text'], 49 if caption['marker'] else 54, 964), fill=255, spacing=3)
    # A source-locked night/day wipe can cross a text line: choose ink per pixel.
    colours = np.asarray(image).copy()
    light = colours.mean(axis=2) > 125
    colours[light] = (31, 29, 33)
    colours[~light] = (242, 236, 218)
    image.paste(Image.fromarray(colours), (0, 0), text)
    draw = ImageDraw.Draw(image)
    if caption['marker']:
        marker = type_text(caption['marker'], ink_progress(ink, frame, end, 'marker'))
        mf = font(39)
        dark = np.asarray(image)[20:40, 60:800].mean() < 120
        red = '#d67c66' if dark else '#b84c3f'
        draw.text((60, 47), marker, font=mf, fill=red)
        if marker:
            draw.line((54, 104, 60+mf.getlength(marker), 104), fill=red, width=2)
    group = LABELS.get(shot.get('labels'), [])
    if group:
        start, stop = shot['start'], min(N, shot['start']+64)
        for index, (label, (x0, y0, x1, y1), size) in enumerate(group):
            maximum = max(row['labels'][index] for row in ink[start:stop])
            current = ink[frame]['labels'][index]
            ratio = current / maximum if maximum else 0
            if ratio < .12:
                continue
            lf = fit_font(label, size, x1-x0)
            label = type_text(label, min(1, ratio*1.4))
            patch = np.asarray(image)[y0:y1, x0:x1]
            colour = '#b6c1d6' if patch.mean() < 110 else '#2b292d'
            if shot.get('labels') == 'map':
                colour = '#adbad3' if patch.mean() < 110 else '#53728f'
            if shot.get('labels') == 'restaurant':
                colour = '#fff4d9'
            width = lf.getlength(label)
            draw.text((x0+(x1-x0-width)/2, y0-2), label, font=lf, fill=colour)
    return cv2.cvtColor(np.asarray(image), cv2.COLOR_RGB2BGR)


def audio_hash(source):
    output = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(source),
        '-map', '0:a:0', '-c', 'copy', '-f', 'hash', '-hash', 'sha256', '-'])
    return output.decode().strip()


def source_exposure(frames, keys, frame):
    # Ignore native-header type-on; choose by the actual illustrated stage.
    target = frames[frame, 84:].astype(np.float32)
    return min(keys, key=lambda key: np.mean(np.square(
        target-frames[key, 84:].astype(np.float32))))


def render(source, work, only_shot=None):
    probe(source)
    assert checked_source_hash(source) == (work/'source-sha256.txt').read_text().strip(), \
        'Reference changed; prepare this source before rendering'
    cv2.setNumThreads(4)
    frames = np.load(work / 'source-proxy.npy', mmap_mode='r')
    ink = json.loads((work / 'source-ink.json').read_text())
    assert frames.shape == (N, FLOW_SIDE, FLOW_SIDE, 3) and len(ink) == N, 'Incomplete prepared source'
    selected = [FILM['shots'][only_shot]] if only_shot is not None else FILM['shots']
    asset_paths = {}
    for shot in selected:
        for key in shot['anchors']:
            path = HERE / 'reference-assets' / f'{key:04d}.webp'
            if not path.exists():
                path = work / f'clay-{key:04d}.png'
            assert path.is_file(), f'Missing checked clay anchor {key}'
            asset_paths[key] = path
    output = work / ('motion-study.mp4' if only_shot is not None else 'kevin-burger-clay-ko-64s.mp4')
    raw = work / 'clay-picture.mp4'
    process = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo',
        '-pixel_format', 'bgr24', '-video_size', f'{SIDE}x{SIDE}', '-framerate', str(FPS),
        '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18',
        '-preset', 'veryfast', '-threads', '4', str(raw)], stdin=subprocess.PIPE)
    grid_x, grid_y = np.meshgrid(np.arange(SIDE, dtype=np.float32), np.arange(SIDE, dtype=np.float32))
    flow = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    for shot in selected:
        keys = shot['anchors']
        styles = {}
        for key in keys:
            path = asset_paths[key]
            image = cv2.imread(str(path))
            assert image is not None, f'Missing checked clay anchor {key}'
            styles[key] = cv2.resize(image, (SIDE, SIDE), interpolation=cv2.INTER_CUBIC)
        start, end = shot['start'], shot['start']+64
        anchor_grey = {key: cv2.cvtColor(frames[key], cv2.COLOR_BGR2GRAY) for key in keys}
        clay_grey = {key: cv2.cvtColor(cv2.resize(styles[key], (FLOW_SIDE, FLOW_SIDE)),
            cv2.COLOR_BGR2GRAY) for key in keys}
        for key in keys:
            # Align the clay edit to its actual reference pose before transferring
            # motion. This limits jumps between independently edited silhouettes.
            alignment = flow.calc(anchor_grey[key], clay_grey[key], None)
            alignment[:84] = 0
            alignment = cv2.resize(alignment, (SIDE, SIDE))*SIDE/FLOW_SIDE
            styles[key] = cv2.remap(styles[key], grid_x+alignment[:, :, 0],
                grid_y+alignment[:, :, 1], cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
        # Keep stationary clay scenery truly stationary. Only source-moving areas
        # may change clay exposures; this prevents whole-frame texture boil.
        delta = np.abs(frames[start:end].astype(np.int16)-frames[keys[0]].astype(np.int16))
        moving = (np.max(delta, axis=(0, 3)) > 24).astype(np.uint8)*255
        moving[:80] = 0  # Native header typography is drawn after motion transfer.
        if shot.get('labels') == 'map' and shot['start'] >= 896:
            moving[:] = 255  # Preserve the reference's full-frame dawn wipe.
        moving = cv2.dilate(moving, np.ones((13, 13), np.uint8))
        moving = cv2.GaussianBlur(moving, (31, 31), 0)
        moving = cv2.resize(moving, (SIDE, SIDE)).astype(np.float32)[:, :, None]/255
        for n in range(start, end):
            # One source-warped material exposure, never a dissolve between
            # independently sculpted contours (which creates transparent doubles).
            # Match the actual source stage, not just elapsed time: a hand-drawn
            # stage can change abruptly halfway between two anchor timestamps.
            nearest = source_exposure(frames, keys, n)
            weights = [(nearest, 1)]
            target = cv2.cvtColor(frames[n], cv2.COLOR_BGR2GRAY)
            painted = np.zeros((SIDE, SIDE, 3), np.float32)
            for key, weight in weights:
                field = flow.calc(target, anchor_grey[key], None)
                field = cv2.resize(field, (SIDE, SIDE))*SIDE/FLOW_SIDE
                warped = cv2.remap(styles[key], grid_x+field[:, :, 0], grid_y+field[:, :, 1],
                    cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
                painted += warped*weight
            painted = np.clip(painted*moving+styles[keys[0]]*(1-moving), 0, 255).astype(np.uint8)
            painted = text_frame(painted, n, ink)
            process.stdin.write(painted.tobytes())
            if n == start+32:
                cv2.imwrite(str(work / f"review-{shot['id']}.png"), painted)
        print(f"Rendered {shot['id']}: {start/FPS:.3f}–{end/FPS:.3f}s", flush=True)
    process.stdin.close()
    assert process.wait() == 0, 'Picture encoder failed'
    if only_shot is not None:
        raw.replace(output)
        print(output, flush=True)
        return
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(raw), '-i', str(source),
        '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy', '-movflags', '+faststart', str(output)], check=True)
    details = probe(output)
    assert audio_hash(source) == audio_hash(output), 'Reference AAC changed'
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(output), '-f', 'null', '-'], check=True)
    review = {'reference': FILM['reference'], 'contract': FILM['contract'],
        'source_sha256': (work/'source-sha256.txt').read_text().strip(),
        'audio_payload_sha256': audio_hash(output), 'frames': N, 'shots': len(FILM['shots']),
        'text': 'Korean translation of original English captions and labels',
        'numbers': 'Original values except owner-approved Hanwoo age (~30 months) and matching totals',
        'localization': FILM['localization'],
        'font': 'Jua Regular, SIL Open Font License 1.1 (bundled)',
        'motion': 'Source-derived optical flow; one source-stage-matched registered clay exposure, no material cross-fades',
        'full_decode': 'passed', 'video': str(output), 'bytes': output.stat().st_size,
        'streams': details['streams']}
    (work / 'export-review.json').write_text(json.dumps(review, indent=2))
    print(json.dumps({k: review[k] for k in ['frames', 'shots', 'full_decode', 'video', 'bytes']}), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['prepare', 'render'])
    parser.add_argument('source', type=Path)
    parser.add_argument('work', type=Path)
    parser.add_argument('--shot', type=int, choices=range(len(FILM['shots'])), default=None)
    args = parser.parse_args()
    assert args.source.is_file(), 'Supply the downloaded Kevin Ngo reference MP4'
    if args.action == 'prepare':
        prepare(args.source.resolve(), args.work.resolve())
    else:
        render(args.source.resolve(), args.work.resolve(), args.shot)
