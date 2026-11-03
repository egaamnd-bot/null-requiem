#!/usr/bin/env python3
"""
Deterministic synthesis of the sounds the creative package did not contain (Producer-authorised, 2026-11-03):
movement, enemy, door, pickup, interaction and UI SFX, three stingers and the looped environmental layers.

  python3 tools/audio/synth_missing.py [--out art/incoming/audio]

Every sound is generated from numpy oscillators/noise/filters with fixed seeds (re-running gives identical files), saved as a FLAC master in
art/audio/masters/claude-synth-01/ and conditioned to the catalog targets (same rules as process_handoff.py) into Ogg Vorbis candidates in the
intake folder. These are preliminary, code-synthesised sounds in the Wet-Neon / rainy cyber-gothic spirit of the supplied sketches; they are
meant to be replaced by authored audio later. Requires python3, numpy, scipy, ffmpeg (libvorbis).
"""
import argparse
import os
import sys
import tempfile

import numpy as np
from scipy import signal

sys.path.insert(0, os.path.dirname(__file__))
from process_handoff import encode_ogg, loudnorm_to_ogg, make_loop, run, write_wav  # noqa: E402

SR = 44100
MASTERS = os.path.join(os.path.dirname(__file__), '..', '..', 'art', 'audio', 'masters', 'claude-synth-01')
PEAK_DB = {'sfx': -10.0, 'ui': -14.0}


# ------------------------------------------------------------------ primitives
def rng_for(name):
    return np.random.default_rng(sum(ord(c) * (i + 1) for i, c in enumerate(name)))


def t_(dur):
    return np.arange(int(SR * dur)) / SR


def env(n, a=0.003, d=0.1, s=0.0, r=0.05):
    """Simple ADSR-ish envelope with exponential decay to sustain level `s`."""
    x = np.zeros(n)
    na, nd, nr = max(1, int(SR * a)), int(SR * d), int(SR * r)
    x[:na] = np.linspace(0, 1, na)
    rest = np.arange(n - na)
    x[na:] = s + (1 - s) * np.exp(-rest / max(1, nd) * 3)
    if nr:
        x[-nr:] *= np.linspace(1, 0, nr)
    return x


def sweep(f0, f1, dur, curve='exp'):
    t = t_(dur)
    if curve == 'exp':
        f = f0 * (f1 / f0) ** (t / dur)
    else:
        f = f0 + (f1 - f0) * t / dur
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def saw(f, dur, detune=0.0):
    t = t_(dur)
    f = np.broadcast_to(f, t.shape) if np.ndim(f) else np.full(t.shape, f)
    ph = np.cumsum(f * (1 + detune)) / SR
    return 2 * (ph % 1) - 1


def square(f, dur, duty=0.5):
    t = t_(dur)
    f = np.broadcast_to(f, t.shape) if np.ndim(f) else np.full(t.shape, f)
    ph = np.cumsum(f) / SR
    return np.where((ph % 1) < duty, 1.0, -1.0)


def noise(dur, rng):
    return rng.standard_normal(int(SR * dur))


def lp(x, fc, order=2):
    return signal.sosfilt(signal.butter(order, fc, 'low', fs=SR, output='sos'), x)


def hp(x, fc, order=2):
    return signal.sosfilt(signal.butter(order, fc, 'high', fs=SR, output='sos'), x)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)


def fm(fc, ratio, index, dur, decay=0.2):
    t = t_(dur)
    mod = np.sin(2 * np.pi * fc * ratio * t) * index * np.exp(-t / decay)
    return np.sin(2 * np.pi * fc * t + mod)


def echo(x, delay=0.12, fb=0.35, n=3):
    d = int(SR * delay)
    out = np.zeros(len(x) + d * n)
    for i in range(n + 1):
        out[i * d : i * d + len(x)] += x * (fb**i)
    return out


def mix(*parts):
    n = max(len(p) for p in parts)
    out = np.zeros(n)
    for p in parts:
        out[: len(p)] += p
    return out


def crush(x, bits=6):
    q = 2**bits
    return np.round(x * q) / q


def delay_reverb(x, rng, wet=0.25, tail=0.9):
    """Cheap diffuse reverb: a few random decaying taps blurred together (enough for stingers/pads)."""
    n = int(SR * tail)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / (SR * tail / 4))
    ir = lp(ir, 3500)
    ir /= np.max(np.abs(ir)) + 1e-9
    wetsig = signal.fftconvolve(x, ir)
    out = wet * wetsig / (np.max(np.abs(wetsig)) + 1e-9) * np.max(np.abs(x))
    out[: len(x)] += x
    return out


def stereo(x, width, rng):
    """Pseudo-stereo from a mono array via a short Haas delay + complementary comb (width in 0..1)."""
    d = int(SR * 0.012)
    r = np.roll(x, d) * width + x * (1 - width)
    l = np.roll(x, -d) * width + x * (1 - width)
    return np.stack([l, r], axis=1)


# ------------------------------------------------------------------ SFX
def footstep(i):
    rng = rng_for(f'footstep{i}')
    splash = bp(noise(0.14, rng), 900 + i * 300, 4200) * env(int(SR * 0.14), 0.001, 0.035, 0, 0.04)
    thump = sweep(150 - i * 20, 70, 0.12) * env(int(SR * 0.12), 0.001, 0.03, 0, 0.03)
    return mix(0.8 * splash, 0.7 * thump)


def land():
    rng = rng_for('land')
    return mix(1.0 * sweep(160, 45, 0.25) * env(int(SR * 0.25), 0.001, 0.07, 0, 0.06), 0.5 * lp(noise(0.22, rng), 1800) * env(int(SR * 0.22), 0.001, 0.05, 0, 0.05), 0.25 * hp(noise(0.12, rng), 3000) * env(int(SR * 0.12), 0.001, 0.03, 0, 0.03))


def airjump():
    s = sweep(520, 1500, 0.22) * env(int(SR * 0.22), 0.01, 0.07, 0.1, 0.08)
    sh = fm(1800, 2.0, 2.0, 0.2, 0.06) * env(int(SR * 0.2), 0.005, 0.05, 0, 0.06) * 0.4
    return mix(s, sh)


def hurt():
    rng = rng_for('hurt')
    f = np.linspace(330, 110, int(SR * 0.4))
    body = crush(saw(f, 0.4) * 0.8, 5) * env(int(SR * 0.4), 0.002, 0.12, 0.05, 0.1)
    crunch = bp(noise(0.25, rng), 300, 5000) * env(int(SR * 0.25), 0.001, 0.05, 0, 0.1)
    return mix(body * 0.8, crunch * 0.8, sweep(90, 40, 0.3) * env(int(SR * 0.3), 0.001, 0.1, 0, 0.1))


def death():
    rng = rng_for('death')
    n = int(SR * 1.5)
    f = 420 * (40 / 420) ** (t_(1.5) / 1.5)
    body = crush(saw(f, 1.5) * 0.7, 4) * env(n, 0.003, 0.5, 0.05, 0.4)
    glitch = noise(1.5, rng) * (np.floor(t_(1.5) * 24) % 2) * env(n, 0.001, 0.4, 0, 0.5) * 0.35
    boom = sweep(110, 28, 1.2) * env(int(SR * 1.2), 0.001, 0.5, 0, 0.4)
    return mix(body * 0.7, glitch, boom)


def bt_ready():
    a = fm(880, 2.0, 1.5, 0.35, 0.12) * env(int(SR * 0.35), 0.002, 0.1, 0, 0.1)
    b = np.pad(fm(1320, 2.0, 1.2, 0.3, 0.1) * env(int(SR * 0.3), 0.002, 0.1, 0, 0.1), (int(SR * 0.08), 0))
    return echo(mix(a, b), 0.07, 0.3, 2)


def bt_cooldown():
    rng = rng_for('btcd')
    n = int(SR * 0.5)
    whoosh = bp(noise(0.5, rng), 300, 2500) * np.linspace(1, 0, n) ** 1.5 * np.linspace(0.3, 1, n) ** 0.5
    tone = sweep(900, 220, 0.5) * env(n, 0.01, 0.2, 0.1, 0.15)
    return mix(0.6 * whoosh, 0.6 * tone)


def telegraph():
    n = int(SR * 0.5)
    t = t_(0.5)
    f = 280 + 640 * (t / 0.5) ** 1.5
    trem = 0.6 + 0.4 * np.sin(2 * np.pi * 14 * t)
    return (square(f, 0.5, 0.35) * 0.5 + saw(f * 1.01, 0.5) * 0.4) * trem * env(n, 0.02, 0.3, 0.6, 0.08)


def hound_lunge():
    rng = rng_for('lunge')
    n = int(SR * 0.4)
    t = t_(0.4)
    growl = lp(saw(95 - 30 * t / 0.4, 0.4), 700) * (0.7 + 0.3 * np.sin(2 * np.pi * 38 * t)) * env(n, 0.01, 0.2, 0.2, 0.1)
    whoosh = bp(noise(0.4, rng), 500, 3500) * np.hanning(n) * 0.7
    return mix(growl * 0.9, whoosh)


def drone_projectile():
    rng = rng_for('dproj')
    zap = saw(np.linspace(2000, 380, int(SR * 0.25)), 0.25) * env(int(SR * 0.25), 0.001, 0.06, 0, 0.08)
    return mix(0.7 * zap, 0.4 * hp(noise(0.12, rng), 4000) * env(int(SR * 0.12), 0.001, 0.03, 0, 0.04))


def hit_heavy():
    rng = rng_for('heavy')
    n = int(SR * 0.45)
    boom = sweep(110, 38, 0.45) * env(n, 0.001, 0.15, 0, 0.15)
    crack = bp(noise(0.2, rng), 800, 7000) * env(int(SR * 0.2), 0.001, 0.04, 0, 0.06)
    ring = fm(420, 2.7, 3.0, 0.45, 0.15) * env(n, 0.001, 0.12, 0, 0.12) * 0.35
    return mix(boom, 0.8 * crack, ring)


def enemy_death():
    rng = rng_for('edeath')
    n = int(SR * 0.9)
    glitch = crush(saw(np.linspace(900, 70, n), 0.9) * 0.6, 4) * env(n, 0.002, 0.3, 0, 0.3)
    debris = bp(noise(0.9, rng), 600, 6000) * env(n, 0.001, 0.25, 0, 0.3) * (np.floor(t_(0.9) * 30) % 2 * 0.6 + 0.4)
    return mix(0.7 * glitch, 0.6 * debris, 0.7 * sweep(120, 35, 0.6) * env(int(SR * 0.6), 0.001, 0.2, 0, 0.2))


def boss_warning():
    rng = rng_for('boss')
    dur = 2.2
    n = int(SR * dur)
    t = t_(dur)
    f = 55 * (2.0 ** (t / dur))
    stack = (saw(f, dur) + saw(f * 1.5, dur, 0.003) * 0.6 + saw(f * 2, dur, -0.004) * 0.4) * 0.45
    pulse = 0.55 + 0.45 * (np.sin(2 * np.pi * 3.2 * t) > 0)
    return lp(stack, 1400) * pulse * env(n, 0.05, 1.0, 0.7, 0.3) + 0.2 * lp(noise(dur, rng), 400) * env(n, 0.1, 1.0, 0.5, 0.3)


def door_close():
    rng = rng_for('dclose')
    thunk = sweep(190, 80, 0.25) * env(int(SR * 0.25), 0.001, 0.06, 0, 0.06)
    clank = bp(noise(0.3, rng), 1200, 4500) * env(int(SR * 0.3), 0.001, 0.06, 0, 0.08)
    latch = np.pad(fm(1500, 3.1, 2.0, 0.1, 0.03) * env(int(SR * 0.1), 0.001, 0.02, 0, 0.03), (int(SR * 0.2), 0))
    return mix(thunk, 0.6 * clank, 0.4 * latch)


def relay_activate():
    notes = [523.25, 659.25, 783.99, 1046.5]
    parts = [np.pad(fm(f, 2.0, 1.2, 0.5, 0.15) * env(int(SR * 0.5), 0.003, 0.15, 0, 0.1), (int(SR * 0.09 * i), 0)) for i, f in enumerate(notes)]
    shimmer = hp(noise(0.9, rng_for('relay')), 6000) * env(int(SR * 0.9), 0.05, 0.3, 0, 0.3) * 0.12
    return echo(mix(*parts, shimmer), 0.1, 0.35, 3)


def pressure_plate():
    c1 = hp(noise(0.03, rng_for('p1')), 2000) * env(int(SR * 0.03), 0.0005, 0.008, 0, 0.01)
    c2 = np.pad(hp(noise(0.03, rng_for('p2')), 1500) * env(int(SR * 0.03), 0.0005, 0.008, 0, 0.01), (int(SR * 0.07), 0))
    tone = np.pad(sweep(300, 180, 0.2) * env(int(SR * 0.2), 0.002, 0.06, 0, 0.06), (int(SR * 0.07), 0)) * 0.7
    return mix(c1, c2, tone)


def breakable_wall():
    rng = rng_for('wall')
    n = int(SR * 1.0)
    crumble = lp(noise(1.0, rng), 2500) * env(n, 0.001, 0.35, 0, 0.3) * (0.5 + 0.5 * (rng.random(n) > 0.6))
    rocks = np.zeros(n)
    for k in range(10):
        p = int(SR * (0.02 + k * 0.07 + rng.random() * 0.04))
        burst = bp(noise(0.05, rng), 500, 3500) * env(int(SR * 0.05), 0.001, 0.012, 0, 0.02)
        rocks[p : p + len(burst)] += burst[: n - p] * (0.9 - k * 0.07)
    thud = sweep(100, 35, 0.4) * env(int(SR * 0.4), 0.001, 0.12, 0, 0.1)
    return mix(0.7 * crumble, 0.8 * rocks, thud)


def pickup_integrity():
    a = fm(523.25, 2.0, 0.8, 0.5, 0.2) * env(int(SR * 0.5), 0.005, 0.18, 0, 0.1)
    b = np.pad(fm(784, 2.0, 0.8, 0.5, 0.2) * env(int(SR * 0.5), 0.005, 0.18, 0, 0.1), (int(SR * 0.1), 0))
    return echo(mix(a, b), 0.09, 0.3, 2)


def pickup_scrap():
    return fm(2100, 3.5, 2.5, 0.2, 0.05) * env(int(SR * 0.2), 0.0008, 0.05, 0, 0.05)


def pickup_module():
    notes = [392.0, 523.25, 659.25, 783.99, 1046.5, 1318.5]
    parts = [np.pad(fm(f, 2.0, 1.0, 0.9, 0.3) * env(int(SR * 0.9), 0.004, 0.3, 0.0, 0.2), (int(SR * 0.12 * i), 0)) for i, f in enumerate(notes)]
    pad = (sweep(196, 392, 1.6, 'lin') * 0.3 + sweep(294, 588, 1.6, 'lin') * 0.2) * env(int(SR * 1.6), 0.2, 1.0, 0.4, 0.5)
    return echo(mix(*parts, pad), 0.12, 0.4, 3)


def checkpoint():
    chord = sum(sweep(f * 0.98, f, 1.2, 'lin') * a for f, a in [(261.6, 0.5), (392.0, 0.4), (523.25, 0.35)]) * env(int(SR * 1.2), 0.15, 0.6, 0.3, 0.4)
    ping = np.pad(fm(1568, 2.0, 1.0, 0.5, 0.2) * env(int(SR * 0.5), 0.002, 0.2, 0, 0.1), (int(SR * 0.3), 0)) * 0.4
    return echo(mix(chord, ping), 0.11, 0.35, 3)


def quest_update():
    a = fm(659.25, 2.0, 0.9, 0.3, 0.1) * env(int(SR * 0.3), 0.003, 0.1, 0, 0.08)
    b = np.pad(fm(880, 2.0, 0.9, 0.35, 0.12) * env(int(SR * 0.35), 0.003, 0.12, 0, 0.1), (int(SR * 0.11), 0))
    return mix(a, b)


# UI
def ui_pause():
    return mix(sweep(700, 260, 0.2) * env(int(SR * 0.2), 0.002, 0.06, 0, 0.06), 0.4 * sweep(1400, 520, 0.2) * env(int(SR * 0.2), 0.002, 0.05, 0, 0.06))


def ui_error():
    t = t_(0.22)
    buzz = square(150, 0.22, 0.5) * (np.sin(2 * np.pi * 18 * t) > -0.2)
    return lp(buzz, 900) * env(int(SR * 0.22), 0.002, 0.1, 0.4, 0.04)


def ui_tab():
    return fm(1400, 2.0, 1.0, 0.07, 0.02) * env(int(SR * 0.07), 0.0008, 0.02, 0, 0.02)


def ui_slider():
    return fm(2000, 1.5, 0.8, 0.04, 0.01) * env(int(SR * 0.04), 0.0005, 0.012, 0, 0.012)


def ui_save():
    a = fm(784, 2.0, 0.8, 0.2, 0.08) * env(int(SR * 0.2), 0.002, 0.08, 0, 0.05)
    b = np.pad(fm(1175, 2.0, 0.8, 0.28, 0.1) * env(int(SR * 0.28), 0.002, 0.1, 0, 0.08), (int(SR * 0.08), 0))
    return mix(a, b)


def ui_continue():
    s = sweep(220, 880, 0.45) * env(int(SR * 0.45), 0.02, 0.2, 0.3, 0.12)
    top = np.pad(fm(1318.5, 2.0, 1.0, 0.3, 0.1) * env(int(SR * 0.3), 0.002, 0.1, 0, 0.1), (int(SR * 0.18), 0))
    return mix(0.6 * s, 0.6 * top)


SFX = {
    'sfx_player_footstep_wet': (lambda: footstep(0), 'sfx'),  # one file; the engine adds per-play pitch variation (catalog)
    'sfx_player_land': (land, 'sfx'),
    'sfx_player_airjump': (airjump, 'sfx'),
    'sfx_player_hurt': (hurt, 'sfx'),
    'sfx_player_death': (death, 'sfx'),
    'sfx_backtrace_ready': (bt_ready, 'sfx'),
    'sfx_backtrace_cooldown': (bt_cooldown, 'sfx'),
    'sfx_enemy_telegraph': (telegraph, 'sfx'),
    'sfx_scrap_hound_lunge': (hound_lunge, 'sfx'),
    'sfx_drone_projectile': (drone_projectile, 'sfx'),
    'sfx_hit_heavy': (hit_heavy, 'sfx'),
    'sfx_enemy_death': (enemy_death, 'sfx'),
    'sfx_boss_warning': (boss_warning, 'sfx'),
    'sfx_door_close': (door_close, 'sfx'),
    'sfx_relay_activate': (relay_activate, 'sfx'),
    'sfx_pressure_plate': (pressure_plate, 'sfx'),
    'sfx_breakable_wall': (breakable_wall, 'sfx'),
    'sfx_pickup_integrity': (pickup_integrity, 'sfx'),
    'sfx_pickup_scrap': (pickup_scrap, 'sfx'),
    'sfx_pickup_module': (pickup_module, 'sfx'),
    'sfx_checkpoint': (checkpoint, 'sfx'),
    'sfx_quest_update': (quest_update, 'sfx'),
    'sfx_ui_pause': (ui_pause, 'ui'),
    'sfx_ui_error': (ui_error, 'ui'),
    'sfx_ui_tab': (ui_tab, 'ui'),
    'sfx_ui_slider': (ui_slider, 'ui'),
    'sfx_ui_save': (ui_save, 'ui'),
    'sfx_ui_continue': (ui_continue, 'ui'),
}


# ------------------------------------------------------------------ stingers (stereo, loudness-normalised)
def pad_chord(freqs, dur, a=0.15, rel=0.6):
    n = int(SR * dur)
    x = np.zeros(n)
    for f in freqs:
        x += (saw(f, dur, 0.002) + saw(f, dur, -0.002)) * 0.25
    return lp(x, 2200) * env(n, a, dur * 0.5, 0.6, rel)


def victory():
    rng = rng_for('victory')
    seq = [([261.6, 329.6, 392.0], 0.0), ([293.7, 349.2, 440.0], 1.2), ([329.6, 392.0, 523.25], 2.4), ([392.0, 523.25, 659.25, 783.99], 3.6)]
    out = np.zeros(int(SR * 8.0))
    for ch, at in seq:
        c = pad_chord(ch, 2.2 if at < 3.6 else 4.2)
        out[int(SR * at) : int(SR * at) + len(c)] += c[: len(out) - int(SR * at)]
    arp = [523.25, 659.25, 783.99, 1046.5, 1318.5]
    for i, f in enumerate(arp):
        b = fm(f, 2.0, 1.0, 1.4, 0.4) * env(int(SR * 1.4), 0.004, 0.4, 0, 0.3) * 0.35
        p = int(SR * (3.6 + 0.14 * i))
        out[p : p + len(b)] += b[: len(out) - p]
    out = delay_reverb(out, rng, 0.35, 1.4)[: int(SR * 8.5)]
    return stereo(out, 0.7, rng)


def game_over():
    rng = rng_for('gameover')
    out = np.zeros(int(SR * 6.0))
    for ch, at in [([220.0, 261.6, 329.6], 0.0), ([207.65, 246.9, 311.1], 1.6), ([196.0, 233.1, 293.7], 3.2)]:
        c = pad_chord([f * 0.5 for f in ch], 3.0, 0.05, 1.2)
        out[int(SR * at) : int(SR * at) + len(c)] += c[: len(out) - int(SR * at)]
    sub = sweep(82, 41, 5.0) * env(int(SR * 5), 0.05, 2.5, 0.2, 1.2) * 0.5
    out += np.pad(sub, (0, len(out) - len(sub)))
    out = delay_reverb(out, rng, 0.4, 1.6)[: int(SR * 6.5)]
    return stereo(out, 0.6, rng)


def bt_motif():
    rng = rng_for('btmotif')
    dur = 2.4
    n = int(SR * dur)
    rev = (bp(noise(0.9, rng), 400, 4000) * np.linspace(0, 1, int(SR * 0.9)) ** 2) * 0.4
    out = np.zeros(n)
    out[: len(rev)] += rev
    for i, f in enumerate([523.25, 392.0, 783.99]):  # up-down-up: a "rewind" figure
        b = fm(f, 2.0, 1.3, 1.0, 0.25) * env(int(SR * 1.0), 0.003, 0.25, 0, 0.2) * 0.45
        p = int(SR * (0.85 + 0.17 * i))
        out[p : p + len(b)] += b[: n - p]
    out = delay_reverb(out, rng, 0.3, 1.0)[: int(SR * 2.6)]
    return stereo(out, 0.6, rng)


STINGERS = {'music_victory': victory, 'music_game_over': game_over, 'music_backtrace_motif': bt_motif}


# ------------------------------------------------------------------ ambience loops (generated long, then crossfaded into a seamless loop)
def city_traffic():
    rng = rng_for('city')
    dur = 24.0
    n = int(SR * dur)
    base = lp(noise(dur, rng), 260) * 0.5
    out = base.copy()
    t = t_(dur)
    # passing vehicles: bandpass noise swells with a slow centre-frequency glide, spread over the clip
    for k in range(7):
        c = rng.random() * (dur - 6) + 2.5
        width = 2.2 + rng.random() * 2
        env_ = np.exp(-((t - c) ** 2) / (2 * (width / 2.5) ** 2))
        out += bp(noise(dur, rng), 90, 700 + 300 * rng.random()) * env_ * 0.9
    dist = hp(noise(dur, rng), 3500) * 0.015 * (0.6 + 0.4 * np.sin(2 * np.pi * t / 8))
    return stereo(out + dist, 0.8, rng)


def neon_hum():
    rng = rng_for('neon')
    dur = 12.0
    t = t_(dur)
    base = np.sin(2 * np.pi * 120 * t) + 0.5 * np.sin(2 * np.pi * 240 * t) + 0.25 * np.sin(2 * np.pi * 360 * t)
    flick = 0.8 + 0.2 * np.sin(2 * np.pi * t / 4) * np.sin(2 * np.pi * t / 3)
    crackle = hp(noise(dur, rng), 5000) * (rng.random(len(t)) > 0.9995) * 3
    return mix(base * flick * 0.4, lp(crackle, 9000)) * 1.0


def electrical_buzz():
    rng = rng_for('buzz')
    dur = 16.0
    t = t_(dur)
    x = square(100, dur, 0.5) * 0.25 + saw(200.5, dur) * 0.15
    mod = 0.7 + 0.3 * np.sin(2 * np.pi * t / 2)
    return lp(x, 2500) * mod + 0.05 * bp(noise(dur, rng), 2000, 6000)


def machinery():
    rng = rng_for('mach')
    dur = 20.0
    t = t_(dur)
    drone = np.sin(2 * np.pi * 55 * t) * 0.6 + np.sin(2 * np.pi * 110.3 * t) * 0.3
    thrum = (0.5 + 0.5 * np.sin(2 * np.pi * t / 2.5)) * lp(noise(dur, rng), 180)
    clank = np.zeros(len(t))
    for k in range(5):
        p = int(SR * (1.5 + k * 3.8 + rng.random()))
        c = bp(noise(0.12, rng), 600, 2800) * env(int(SR * 0.12), 0.001, 0.025, 0, 0.04)
        clank[p : p + len(c)] += c * 0.12
    return drone * 0.3 + thrum * 0.7 + clank


def transit_bed():
    rng = rng_for('transit')
    dur = 30.0
    t = t_(dur)
    rumble = lp(noise(dur, rng), 120) * 1.4
    train = np.zeros(len(t))
    for c in (7.0, 21.0):
        e = np.exp(-((t - c) ** 2) / (2 * 1.6**2))
        train += bp(noise(dur, rng), 60, 500) * e * 1.8
    hiss = hp(noise(dur, rng), 4000) * 0.01
    return stereo(rumble + train + hiss, 0.7, rng)


def vault_bed():
    rng = rng_for('vault')
    dur = 30.0
    t = t_(dur)
    hum = np.sin(2 * np.pi * 50 * t) * 0.5 + np.sin(2 * np.pi * 100.2 * t) * 0.25 + np.sin(2 * np.pi * 150.1 * t) * 0.12
    vent = bp(noise(dur, rng), 500, 2500) * (0.2 + 0.1 * np.sin(2 * np.pi * t / 6))
    sub = np.sin(2 * np.pi * 31 * t) * 0.3 * (0.6 + 0.4 * np.sin(2 * np.pi * t / 10))
    return stereo(hum + vent * 0.6 + sub, 0.8, rng)


# id -> (generator, target LUFS, crossfade s)
LOOPS = {
    'amb_city_traffic': (city_traffic, -24.0, 1.0),
    'amb_neon_sign_hum': (neon_hum, -24.0, 0.5),
    'amb_electrical_buzz': (electrical_buzz, -24.0, 0.5),
    'amb_machinery': (machinery, -24.0, 0.8),
    'amb_transit_stacks_loop': (transit_bed, -24.0, 1.0),
    'amb_precinct_vault_loop': (vault_bed, -24.0, 1.0),
}


# ------------------------------------------------------------------ driver
def save_master(name, x):
    os.makedirs(MASTERS, exist_ok=True)
    with tempfile.TemporaryDirectory() as d:
        w = os.path.join(d, 'm.wav')
        write_wav(w, SR, x if x.ndim == 2 else x[:, None])
        run(['ffmpeg', '-loglevel', 'error', '-y', '-i', w, '-c:a', 'flac', os.path.join(MASTERS, name + '.flac')])


def condition_sfx(x, kind):
    x = x - np.mean(x)
    thr = 10 ** (-60 / 20)
    idx = np.where(np.abs(x) > thr)[0]
    x = x[idx[0] : idx[-1] + 1].copy()
    fi, fo = int(SR * 0.002), int(SR * 0.02)
    x[:fi] *= np.linspace(0, 1, fi)
    x[-fo:] *= np.linspace(1, 0, fo)
    return x * (10 ** (PEAK_DB[kind] / 20) / np.max(np.abs(x)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.join(os.path.dirname(__file__), '..', '..', 'art', 'incoming', 'audio'))
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    for cid, (fn, kind) in SFX.items():
        x = condition_sfx(fn(), kind)
        save_master(cid, x)
        with tempfile.TemporaryDirectory() as d:
            w = os.path.join(d, 'a.wav')
            write_wav(w, SR, x[:, None])
            encode_ogg(w, os.path.join(a.out, cid + '.ogg'), 5)
        print(cid, round(len(x) / SR, 2), 's')
    for cid, fn in STINGERS.items():
        y = fn()
        save_master(cid, y)
        loudnorm_to_ogg(y, SR, -16.0, os.path.join(a.out, cid + '.ogg'))
        print(cid, round(len(y) / SR, 2), 's')
    for cid, (fn, lufs, xf) in LOOPS.items():
        y = fn()
        y = y if y.ndim == 2 else y[:, None]
        save_master(cid, y)
        loop = make_loop(y, SR, xf)
        loudnorm_to_ogg(loop, SR, lufs, os.path.join(a.out, cid + '.ogg'))
        print(cid, round(len(loop) / SR, 2), 's')


if __name__ == '__main__':
    main()
