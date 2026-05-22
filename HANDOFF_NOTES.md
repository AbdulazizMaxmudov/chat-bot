# Handoff Notes

This package contains the project code without local secrets.

Before running:

1. Copy `.env.example` to `.env`.
2. Fill in real Azure AI Speech and Google credentials.
3. Run `docker compose up -d --build`.

Speech configuration:

- `AZURE_SPEECH_KEY`
- `AZURE_SPEECH_REGION`
- `AZURE_TTS_VOICE_RU`
- `AZURE_TTS_VOICE_UZ`
- `AZURE_TTS_RATE`

Local secret files, `.env`, `.git`, `.agent`, and credential JSON files were intentionally excluded from the archive.
