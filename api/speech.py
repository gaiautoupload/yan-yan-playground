"""Taiwan Mandarin Edge TTS, with bounded synthesis and CDN caching."""
import asyncio
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import edge_tts

VOICE = 'zh-TW-HsiaoChenNeural'

async def synthesize(text):
    audio = bytearray()
    async for chunk in edge_tts.Communicate(text, VOICE, rate='-10%').stream():
        if chunk['type'] == 'audio':
            audio.extend(chunk['data'])
            if len(audio) > 3_000_000:
                raise ValueError('Audio too large')
    if not audio:
        raise ValueError('Empty audio')
    return bytes(audio)

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        text = parse_qs(urlparse(self.path).query).get('text', [''])[0].strip()
        if not text or len(text) > 240:
            self.send_error(400, 'Text must contain 1 to 240 characters')
            return
        try:
            data = asyncio.run(asyncio.wait_for(synthesize(text), timeout=18))
        except Exception as exc:
            print('Edge TTS failed:', type(exc).__name__)
            self.send_response(503)
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            return
        self.send_response(200)
        self.send_header('Content-Type', 'audio/mpeg')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'public, max-age=86400, s-maxage=604800')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(data)
