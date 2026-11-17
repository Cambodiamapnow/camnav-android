# Natural Khmer voice clips

Put one MP3 per phrase here, named exactly as in `SCRIPT.csv` (e.g. `turn_right.mp3`).
Your own files always win over the Azure-generated ones.

- Mono MP3, 22–48 kHz, about 64 kbps is plenty.
- Trim the silence at the start and end (≤ 0.1 s), so joined phrases sound smooth.
- Same speaker and same loudness for every file.

`manifest.json` is rewritten by `tools/make_khmer_voice.py` on every GitHub build.
