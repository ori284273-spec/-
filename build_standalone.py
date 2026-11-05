"""Bundle the complete keyword studio into one offline HTML file."""
from pathlib import Path
import argparse
import zipfile

ROOT = Path(__file__).resolve().parent
DELIVERY_NAME = '闪彩人物库-V4.1-打开这个文件.html'

def build(destination, package=None):
    static = ROOT / 'static'
    html = (static / 'index.html').read_text()
    for name in ['style.css', 'keywords.css']:
        html = html.replace(f'<link rel="stylesheet" href="{name}">', '<style>\n' + (static / name).read_text() + '\n</style>')
    for filename in ['reference-data.js', 'characters.js', 'keywords.js']:
        script = (static / filename).read_text().replace('</script', '<\\/script')
        html = html.replace(f'<script src="{filename}"></script>', '<script>\n' + script + '\n</script>')
    target = Path(destination)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(html, encoding='utf-8')
    if package:
        with zipfile.ZipFile(package, 'w', zipfile.ZIP_DEFLATED) as archive:
            archive.write(target, DELIVERY_NAME)
            archive.write(ROOT / '使用说明.txt', '使用说明.txt')
    print(target)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', default=str(ROOT / 'dist' / '闪彩关键词工坊.html'))
    parser.add_argument('--zip', dest='package')
    args = parser.parse_args()
    build(args.output, args.package)
