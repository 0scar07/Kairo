"""Genera los sonidos de las notificaciones de Kairo en assets/sounds/ (WAV, 44,1 kHz, mono).

  live_start.wav   Al entrar en partida: dos notas de campana que suben (mi5 -> si5).
  live_result.wav  Resultado de la partida: arpegio brillante (do5 - mi5 - sol5 - do6).

Son tonos de campana sintetizados (parciales inarmónicos que decaen) con una cola de reverberación corta.
Uso: python scripts/generate-notification-sounds.py   (requiere numpy)
"""
import os
import wave

import numpy as np

SR = 44100
OUT = "assets/sounds"
rng = np.random.default_rng(7)


def bell(freq, dur, gain=1.0):
    """Una nota de campana: parciales 1, 2.76, 5.4 y 8.9 con decaimientos distintos y un ataque muy corto."""
    t = np.arange(int(SR * dur)) / SR
    parts = [(1.0, 1.0, 3.2), (2.76, 0.42, 5.0), (5.4, 0.18, 8.0), (8.93, 0.08, 12.0)]   # (razón, amplitud, decaimiento)
    y = sum(a * np.exp(-d * t) * np.sin(2 * np.pi * freq * r * t) for r, a, d in parts)
    y *= np.minimum(1.0, t / 0.004)   # ataque de 4 ms: sin clic
    return gain * y


def place(track, note, start):
    i = int(SR * start)
    track[i:i + len(note)] += note[:len(track) - i]


def reverb(y, mix=0.22, tail=0.4):
    n = int(SR * tail)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / (SR * tail / 4.5))
    ir /= np.abs(ir).sum()
    wet = np.convolve(y, ir)[:len(y)]
    return (1 - mix) * y + mix * wet * 6


def save(name, y):
    y = y / np.max(np.abs(y)) * 0.72                        # -3 dBFS aprox.
    fade = int(SR * 0.05)
    y[-fade:] *= np.linspace(1, 0, fade)
    os.makedirs(OUT, exist_ok=True)
    with wave.open(os.path.join(OUT, name), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((y * 32767).astype("<i2").tobytes())
    print(name, f"{len(y) / SR:.2f} s")


# Al entrar en partida: mi5 y si5 (quinta justa hacia arriba)
n = int(SR * 1.5)
start = np.zeros(n)
place(start, bell(659.25, 1.2), 0.0)
place(start, bell(987.77, 1.2, 0.85), 0.17)
save("live_start.wav", reverb(start))

# Resultado: arpegio mayor ascendente
n = int(SR * 1.7)
result = np.zeros(n)
for k, f in enumerate([523.25, 659.25, 783.99, 1046.5]):
    place(result, bell(f, 1.2, 1.0 - 0.06 * k), 0.10 * k)
save("live_result.wav", reverb(result))
