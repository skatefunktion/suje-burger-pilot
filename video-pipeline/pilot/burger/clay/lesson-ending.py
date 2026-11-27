"""Append the owner-approved food-value coda, crossfading the final music second.

Run restyle-reference.py first, then:
  python3 lesson-ending.py /path/to/reference.mp4 /path/to/render-work
The base export remains 64s; the review deliverable is a separate 72s MP4.
"""
import argparse
from functools import lru_cache
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess

import cv2
import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location('reference_clay', HERE/'restyle-reference.py')
REF = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(REF)
SECONDS = REF.FILM['ending']['duration']
TEXT = REF.FILM['ending']['text']


@lru_cache(maxsize=4)
def caption_mask(value, size=54):
    face = REF.fit_font(value, size, 964)
    lines = value.split('\n')
    boxes = [face.getbbox(line) for line in lines]
    height = max(b[3]-b[1] for b in boxes)
    mask = Image.new('L', (REF.SIDE, REF.SIDE))
    draw = ImageDraw.Draw(mask)
    for i, (line, box) in enumerate(zip(lines, boxes)):
        draw.text((60-box[0], 31+i*(height+18)-box[1]), line, font=face, fill=255)
    return mask


def frame(clean, index):
    """Hold the intact final burger; dissolve only type, then fade to paper."""
    old = caption_mask(REF.FILM['captions'][-1]['text'], 64)
    new = caption_mask(TEXT)
    t = index/REF.FPS
    blend = min(1, t/.4)
    mask = Image.blend(old, new, blend)
    image = Image.fromarray(cv2.cvtColor(clean, cv2.COLOR_BGR2RGB))
    image.paste((76, 56, 41), (0, 0, REF.SIDE, REF.SIDE), mask)
    # A finished visual cadence, not a hard cut mid-message or mid-bite.
    fade = float(np.clip((t-(SECONDS-1))/(1-1/REF.FPS), 0, 1))
    if fade:
        paper = Image.new('RGB', image.size, (248, 241, 222))
        image = Image.blend(image, paper, fade*fade*(3-2*fade))
    return cv2.cvtColor(np.asarray(image), cv2.COLOR_RGB2BGR)


def picture_prefix(path):
    # Concat inserts H.264 parameter sets, so compressed-packet bytes may differ
    # even with stream copy. Compare decoded picture hashes AND timestamps.
    return subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path),
        '-map', '0:v:0', '-t', '64', '-f', 'framemd5', '-'])


def coda_plate(clean, ink):
    """Keep the final native signature, removing only the old header caption."""
    plate = REF.text_frame(clean, REF.N-1, ink)
    plate[:238] = clean[:238]
    return plate


def pcm_prefix(path, seconds=63):
    return subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path),
        '-map', '0:a:0', '-t', str(seconds), '-f', 's16le', '-'])


def build_music(source, work):
    """Keep music through 63s; crossfade 63–64s, then fade the 8s reprise.

    A copied AAC prefix plus independently encoded tail had an audible restart.
    The owner approved changing the last ~1s to make this transition clean.
    Verify the lossless mix before AAC encoding, not a lossy PCM hash equality.
    """
    music = work/'lesson-music.wav'
    graph = ('[0:a]atrim=end=64,asetpts=PTS-STARTPTS[original];'
        '[0:a]atrim=start=55:end=64,asetpts=PTS-STARTPTS[reprise];'
        '[original][reprise]acrossfade=d=1:c1=tri:c2=tri,'
        'afade=t=out:st=64:d=8[music]')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(source),
        '-filter_complex', graph, '-map', '[music]', '-ar', '48000', '-ac', '2',
        '-c:a', 'pcm_s16le', str(music)], check=True)
    original_pcm = pcm_prefix(source)
    assert pcm_prefix(music) == original_pcm, 'Music before 63s changed in the mix'
    return music, hashlib.sha256(original_pcm).hexdigest()


def append(source, work):
    base = work/'kevin-burger-clay-ko-64s.mp4'
    assert REF.audio_hash(base) == REF.audio_hash(source), 'Base AAC must be unchanged'
    clean = cv2.imread(str(work/'lesson-ending-clean.png'))
    assert clean is not None and clean.shape == (1080, 1080, 3), 'Render the base film first'
    clean = coda_plate(clean, json.loads((work/'source-ink.json').read_text()))
    tail = work/'lesson-picture.mp4'
    encoder = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo',
        '-pixel_format', 'bgr24', '-video_size', '1080x1080', '-framerate', str(REF.FPS),
        '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18',
        '-preset', 'veryfast', '-threads', '4', str(tail)], stdin=subprocess.PIPE)
    for n in range(SECONDS*REF.FPS):
        picture = frame(clean, n)
        encoder.stdin.write(picture.tobytes())
        if n == 48:
            cv2.imwrite(str(work/'review-food-value-ending.jpg'), picture)
    encoder.stdin.close()
    assert encoder.wait() == 0, 'Coda encoder failed'

    music, music_hash = build_music(source, work)
    video_list = work/'lesson-video-concat.txt'
    video_list.write_text(f"file 'clay-picture.mp4'\nfile '{tail.name}'\n")
    output = work/'kevin-burger-clay-ko-72s.mp4'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0',
        '-i', str(video_list), '-i', str(music), '-map', '0:v:0', '-map', '1:a:0',
        '-t', '72', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart', str(output)], check=True)

    original_picture = picture_prefix(base)
    assert picture_prefix(output) == original_picture, 'Base 64s picture/timestamps changed'
    info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-count_frames',
        '-show_streams', '-of', 'json', str(output)]))
    video = next(s for s in info['streams'] if s['codec_type'] == 'video')
    assert (video['width'], video['height'], video['r_frame_rate']) == (1080,1080,'24/1')
    assert int(video['nb_read_frames']) == REF.N+SECONDS*REF.FPS
    assert float(video['duration']) == 72
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(output), '-f', 'null', '-'], check=True)
    report = {'video':str(output), 'duration':72, 'frames':1728, 'source_timed_seconds':64,
        'lesson_seconds':SECONDS, 'lesson':TEXT, 'font':'Gowun Dodum Regular (selected B)',
        'first_64s_decoded_picture_and_timestamps':'identical to revised base export',
        'first_64s_framemd5_sha256':hashlib.sha256(original_picture).hexdigest(),
        'lossless_mix_first_63s_pcm_sha256':music_hash,
        'music':'Original music until 63s; approved 1s crossfade into 8s fading reprise. Audio re-encoded to AAC.',
        'full_decode':'passed', 'streams':info['streams']}
    (work/'lesson-export-review.json').write_text(json.dumps(report, indent=2))
    print(json.dumps({k:v for k,v in report.items() if k!='streams'}), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('work', type=Path)
    args = parser.parse_args()
    append(args.source.resolve(), args.work.resolve())
