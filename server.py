"""Local-first illustration reference studio. No external model or upload service."""
import argparse
import hashlib
import io
import json
import mimetypes
import os
from pathlib import Path
import sqlite3
import threading
import uuid
import zipfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).parent.resolve()
DATA = Path(os.environ.get('ATELIER_DATA', str(ROOT / '.data'))).resolve()
MAX_UPLOAD = 512 * 1024 * 1024
MAX_EXPANDED = 1024 * 1024 * 1024
LOCK = threading.Lock()

def initialize():
    (DATA / 'images').mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DATA / 'studio.db') as db:
        db.execute('CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY, body TEXT NOT NULL, revision INTEGER NOT NULL)')

def read_state():
    with sqlite3.connect(DATA / 'studio.db') as db:
        row = db.execute('SELECT body,revision FROM state WHERE id=1').fetchone()
    return {'state': json.loads(row[0]) if row else None, 'revision': row[1] if row else 0}

def save_state(payload):
    with LOCK, sqlite3.connect(DATA / 'studio.db') as db:
        row = db.execute('SELECT revision FROM state WHERE id=1').fetchone()
        revision = row[0] if row else 0
        if payload.get('revision') != revision:
            raise ValueError('版本冲突：请刷新页面后重新编辑，避免覆盖其他窗口的修改。')
        db.execute('INSERT OR REPLACE INTO state VALUES (1,?,?)', (json.dumps(payload['state'], ensure_ascii=False), revision + 1))
    return revision + 1

def store_image(raw, name):
    from PIL import Image, ImageOps, UnidentifiedImageError
    Image.MAX_IMAGE_PIXELS = 40_000_000
    try:
        with Image.open(io.BytesIO(raw)) as im:
            im.load()
            im = ImageOps.exif_transpose(im).convert('RGB')
            width, height = im.size
            im.thumbnail((1800,1800))
            output=io.BytesIO(); im.save(output, 'JPEG', quality=90)
            digest=hashlib.sha256(output.getvalue()).hexdigest()[:24]
            (DATA / 'images' / (digest+'.jpg')).write_bytes(output.getvalue())
            return {'id':digest,'name':Path(name).name,'url':'/media/'+digest+'.jpg','width':width,'height':height,
                    'view':'未标注','faceVisible':False,'role':'未分类','note':'','source':name}
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as e:
        raise ValueError('图片不可读取或尺寸超限') from e

def import_archive(raw):
    items=[]; notes=[]; skipped=0
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        entries=z.infolist()
        if len(entries)>5000 or sum(x.file_size for x in entries)>MAX_EXPANDED:
            raise ValueError('ZIP 解压后超过 1 GiB 或 5000 个文件，请拆分导入。')
        for entry in entries:
            path=Path(entry.filename)
            if entry.is_dir(): continue
            if path.is_absolute() or '..' in path.parts or '\\' in entry.filename:
                skipped+=1; continue
            if entry.file_size>40*1024*1024 or entry.flag_bits & 1:
                skipped+=1; continue
            ext=path.suffix.lower()
            if ext in ('.png','.jpg','.jpeg','.webp','.gif','.bmp'):
                try: items.append(store_image(z.read(entry),entry.filename))
                except ValueError: skipped+=1
            elif ext in ('.txt','.md','.json','.csv') and entry.file_size<2*1024*1024:
                try: notes.append({'name':entry.filename,'text':z.read(entry).decode('utf-8-sig')})
                except UnicodeError: skipped+=1
            else: skipped+=1
    return {'images':items,'documents':notes,'skipped':skipped}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs): super().__init__(*args,directory=str(ROOT / 'static'),**kwargs)
    def end_headers(self):
        self.send_header('Cache-Control','no-store, max-age=0')
        self.send_header('X-Atelier-Version','4.2')
        super().end_headers()
    def reply(self, data, status=200):
        body=json.dumps(data,ensure_ascii=False).encode()
        self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length',str(len(body))); self.end_headers(); self.wfile.write(body)
    def do_GET(self):
        path=unquote(urlsplit(self.path).path)
        if path=='/api/version':
            catalog=json.loads((ROOT / 'static' / 'references' / 'catalog.json').read_text())
            return self.reply({'version':'4.2','characters':len(catalog),'images':sum(len(c['images']) for c in catalog),'entry':'static/index.html'})
        if path=='/api/state': return self.reply(read_state())
        if path.startswith('/media/'):
            name=path.removeprefix('/media/')
            if len(name)!=28 or not name.endswith('.jpg') or any(c not in '0123456789abcdef' for c in name[:-4]): return self.send_error(404)
            file=DATA / 'images' / name
            if not file.is_file(): return self.send_error(404)
            body=file.read_bytes(); self.send_response(200); self.send_header('Content-Type','image/jpeg'); self.send_header('Content-Length',str(len(body))); self.end_headers(); self.wfile.write(body); return
        # Development previews must serve current assets even if a browser sends
        # a conditional request for a previous build.
        if 'If-Modified-Since' in self.headers: del self.headers['If-Modified-Since']
        return super().do_GET()
    def do_POST(self):
        if self.headers.get('Sec-Fetch-Site')=='cross-site': return self.reply({'error':'拒绝跨站写入'},403)
        try:
            length=int(self.headers.get('Content-Length','0'))
            if length<=0 or length>MAX_UPLOAD: return self.reply({'error':'上传为空或超过 512 MiB'},413)
            raw=self.rfile.read(length)
            if self.path=='/api/state': return self.reply({'revision':save_state(json.loads(raw))})
            if self.path=='/api/import':
                if zipfile.is_zipfile(io.BytesIO(raw)): return self.reply(import_archive(raw))
                return self.reply({'images':[store_image(raw,unquote(self.headers.get('X-Filename','reference')))],'documents':[],'skipped':0})
            self.reply({'error':'Not found'},404)
        except (ValueError,KeyError,zipfile.BadZipFile,RuntimeError) as e: self.reply({'error':str(e)},400)
        except Exception: self.reply({'error':'服务器处理失败，请检查文件格式并重试。'},500)

if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--port',type=int,default=3000); args=parser.parse_args()
    initialize(); print(f'Atelier listening on port {args.port}',flush=True)
    ThreadingHTTPServer(('0.0.0.0',args.port),Handler).serve_forever()
