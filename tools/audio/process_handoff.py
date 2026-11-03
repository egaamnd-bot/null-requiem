#!/usr/bin/env python3
"""
Reproducible processing of the Pack 01 creative-handoff audio sketches into runtime candidates.

  masters (FLAC, art/audio/masters/handoff-01/)  ->  art/incoming/audio/<catalog id>.ogg   (Ogg Vorbis)
  then:  npm run audio:validate   /   npm run audio:build

What it does (and nothing creative beyond it): mono downmix + silence trim + short fades + peak target for SFX/UI; seamless loop
construction (equal-power tail->head crossfade), repetition to reach the catalog's minimum duration, optional gentle tempo match
between the exploration and combat stems (so the combat stem can phase-align), and two-pass EBU R128 loudness normalisation.
It does not compose, add or replace any musical material. Requires: python3, numpy, scipy, ffmpeg (libvorbis).

usage: python3 tools/audio/process_handoff.py [--out art/incoming/audio]
"""
import argparse
import json
import os
import subprocess
import tempfile

import numpy as np
from scipy.io import wavfile

MASTERS = os.path.join(os.path.dirname(__file__), '..', '..', 'art', 'audio', 'masters', 'handoff-01')

# catalog id -> (master file stem, kind). Mapping rationale: docs/VISUAL_ENHANCEMENT_01.md / docs/AUDIO_UPGRADE_01.md
SFX = {
    'sfx_ui_focus': ('ui_focus', 'ui'),
    'sfx_ui_confirm': ('ui_confirm', 'ui'),
    'sfx_ui_back': ('ui_back', 'ui'),
    'sfx_pickup_memory': ('pickup_memory_fragment', 'sfx'),
    'sfx_player_jump': ('sfx_jump', 'sfx'),
    'sfx_player_dash': ('sfx_dash', 'sfx'),
    'sfx_player_attack': ('sfx_attack', 'sfx'),
    'sfx_hit_light': ('sfx_hit', 'sfx'),
    'sfx_backtrace_release': ('sfx_backtrace_start', 'sfx'),
    'sfx_backtrace_arrival': ('sfx_backtrace_end', 'sfx'),
    'sfx_door_open': ('sfx_door_open', 'sfx'),
    'sfx_drone_charge': ('sfx_enemy_drone', 'sfx'),  # assumption: the drone sketch is its charge-up (the only drone cue with a real event)
}
PEAK_DB = {'sfx': -10.0, 'ui': -14.0}

# catalog id -> (master stem, target LUFS, crossfade s, repeat count, tempo target seconds or None)
LOOPS = {
    'music_title_theme': ('01_title_ambient', -16.0, 1.0, 2, None),
    'music_rainline_exploration': ('02_rainline_exploration', -16.0, 0.5, 2, 26.0),
    'music_rainline_combat': ('03_combat_pulse', -16.0, 0.5, 2, 26.0),  # same tempo-matched length as exploration => phase-aligned stem
    'music_boss_bulwark9': ('04_boss_pressure', -16.0, 0.5, 2, None),
    'amb_rainline_loop': ('rainline_rain_loop', -24.0, 1.0, 2, None),
}


def run(cmd):
    return subprocess.run(cmd, check=True, capture_output=True, text=True)


def read_flac(stem):
    """FLAC -> float32 array (n, ch) and rate, via ffmpeg (no extra deps)."""
    with tempfile.TemporaryDirectory() as d:
        wav = os.path.join(d, 'x.wav')
        run(['ffmpeg', '-loglevel', 'error', '-y', '-i', os.path.join(MASTERS, stem + '.flac'), '-c:a', 'pcm_f32le', wav])
        rate, data = wavfile.read(wav)
    data = data.astype(np.float32)
    return rate, data if data.ndim == 2 else data[:, None]


def write_wav(path, rate, data):
    wavfile.write(path, rate, data.astype(np.float32))


def encode_ogg(wav, out, q):
    run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav, '-c:a', 'libvorbis', '-q:a', str(q), out])


def process_sfx(out_dir, cid, stem, kind):
    rate, x = read_flac(stem)
    m = x.mean(axis=1)
    thr = 10 ** (-60 / 20)
    idx = np.where(np.abs(m) > thr)[0]
    m = m[idx[0] : idx[-1] + 1]
    fi, fo = int(rate * 0.003), int(rate * 0.012)
    m[:fi] *= np.linspace(0, 1, fi)
    m[-fo:] *= np.linspace(1, 0, fo)
    peak = np.max(np.abs(m))
    m = m * (10 ** (PEAK_DB[kind] / 20) / peak)
    with tempfile.TemporaryDirectory() as d:
        w = os.path.join(d, 'a.wav')
        write_wav(w, rate, m[:, None])
        encode_ogg(w, os.path.join(out_dir, cid + '.ogg'), 5)
    return {'id': cid, 'duration': round(len(m) / rate, 3)}


def stretch(rate, x, seconds):
    """Pitch-preserving tempo change to an exact length (ffmpeg atempo)."""
    factor = (len(x) / rate) / seconds
    with tempfile.TemporaryDirectory() as d:
        a, b = os.path.join(d, 'a.wav'), os.path.join(d, 'b.wav')
        write_wav(a, rate, x)
        run(['ffmpeg', '-loglevel', 'error', '-y', '-i', a, '-filter:a', f'atempo={factor:.6f}', '-c:a', 'pcm_f32le', b])
        r2, y = wavfile.read(b)
    y = y.astype(np.float32)
    n = int(round(seconds * rate))
    y = y[:n] if len(y) >= n else np.pad(y, ((0, n - len(y)), (0, 0)))
    return y


def make_loop(x, rate, xf):
    """Equal-power crossfade of the tail onto the head; the result loops without a seam and is `xf` seconds shorter."""
    n = int(rate * xf)
    t = np.linspace(0, np.pi / 2, n)[:, None]
    head = x[:n] * np.sin(t) + x[-n:] * np.cos(t)
    return np.concatenate([head, x[n:-n]], axis=0)


def process_loop(out_dir, cid, stem, lufs, xf, reps, tempo_to):
    rate, x = read_flac(stem)
    if tempo_to:
        x = stretch(rate, x, tempo_to)
    loop = make_loop(x, rate, xf)
    y = np.tile(loop, (reps, 1))
    with tempfile.TemporaryDirectory() as d:
        w = os.path.join(d, 'a.wav')
        write_wav(w, rate, y)
        # two-pass loudnorm (linear) so dynamics are preserved
        p1 = run(['ffmpeg', '-loglevel', 'info', '-y', '-i', w, '-af', f'loudnorm=I={lufs}:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'])
        j = json.loads(p1.stderr[p1.stderr.rindex('{') :])
        af = (
            f"loudnorm=I={lufs}:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:"
            f"measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true"
        )
        n = os.path.join(d, 'n.wav')
        run(['ffmpeg', '-loglevel', 'error', '-y', '-i', w, '-af', af, '-ar', str(rate), '-c:a', 'pcm_f32le', n])
        encode_ogg(n, os.path.join(out_dir, cid + '.ogg'), 5)
    return {'id': cid, 'duration': round(len(y) / rate, 3), 'measured_lufs_in': j['input_i']}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.join(os.path.dirname(__file__), '..', '..', 'art', 'incoming', 'audio'))
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    report = []
    for cid, (stem, kind) in SFX.items():
        report.append(process_sfx(a.out, cid, stem, kind))
    for cid, (stem, lufs, xf, reps, tempo) in LOOPS.items():
        report.append(process_loop(a.out, cid, stem, lufs, xf, reps, tempo))
    for r in report:
        print(r)


if __name__ == '__main__':
    main()
