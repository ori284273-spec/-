"""Import the user's white-background character originals into the static library."""

import argparse
import base64
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import zipfile

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SLUG_TO_ID = {
    "amana": "CHAR-01",
    "asahi": "CHAR-02",
    "chiyoko": "CHAR-03",
    "chiyuki": "CHAR-04",
    "fuyuko": "CHAR-05",
    "hana": "CHAR-06",
    "haruki": "CHAR-07",
    "hinana": "CHAR-08",
    "hiori": "CHAR-09",
    "juri": "CHAR-10",
    "kaho": "CHAR-11",
    "kiriko": "CHAR-12",
    "kogane": "CHAR-13",
    "koito": "CHAR-14",
    "luca": "CHAR-15",
    "madoka": "CHAR-16",
    "mamimi": "CHAR-17",
    "mano": "CHAR-18",
    "meguru": "CHAR-19",
    "mei": "CHAR-20",
    "mikoto": "CHAR-21",
    "natsuha": "CHAR-22",
    "nichika": "CHAR-23",
    "rinze": "CHAR-24",
    "sakuya": "CHAR-25",
    "tenka": "CHAR-26",
    "toru": "CHAR-27",
    "yuika": "CHAR-28",
}


def validate_member(info: zipfile.ZipInfo) -> PurePosixPath:
    path = PurePosixPath(info.filename)
    if path.is_absolute() or ".." in path.parts or "\\" in info.filename:
        raise ValueError(f"Unsafe archive path: {info.filename}")
    if info.file_size > 20 * 1024 * 1024:
        raise ValueError(f"Image is unexpectedly large: {info.filename}")
    return path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("archive", type=Path)
    args = parser.parse_args()

    catalog_path = ROOT / "static" / "references" / "catalog.json"
    catalog = json.loads(catalog_path.read_text())
    records = {entry["id"]: entry for entry in catalog}
    if set(records) != set(SLUG_TO_ID.values()):
        raise ValueError("Existing character catalog does not contain the expected 28 IDs")

    output = ROOT / "static" / "references" / "user-originals"
    output.mkdir(parents=True, exist_ok=True)
    images_by_id = {character_id: [] for character_id in SLUG_TO_ID.values()}

    with zipfile.ZipFile(args.archive) as archive:
        infos = [info for info in archive.infolist() if not info.is_dir()]
        if len(infos) > 200 or sum(info.file_size for info in infos) > 100 * 1024 * 1024:
            raise ValueError("Archive exceeds the import safety limits")
        for info in infos:
            path = validate_member(info)
            if path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
                continue
            if len(path.parts) != 3 or path.parts[1] != "originals":
                raise ValueError(f"Unexpected image location: {info.filename}")
            slug = path.parts[0]
            if slug not in SLUG_TO_ID:
                raise ValueError(f"Unknown character directory: {slug}")
            raw = archive.read(info)
            with Image.open(io.BytesIO(raw)) as image:
                image.verify()
                width, height = image.size
                mime = Image.MIME[image.format]
            character_id = SLUG_TO_ID[slug]
            filename = f"{character_id}-{path.name}"
            relative_path = f"references/user-originals/{filename}"
            (output / filename).write_bytes(raw)
            images_by_id[character_id].append(
                {
                    "path": relative_path,
                    "url": "",
                    "filename": path.name,
                    "sha256": hashlib.sha256(raw).hexdigest(),
                    "width": width,
                    "height": height,
                    "mime": mime,
                    "label": "用户提供原图 · 白底人物立绘",
                    "view": "按原图可见角度使用，不自动推断纯侧面",
                    "lowResolution": min(width, height) < 128,
                    "sourceType": "user_provided_attachment",
                    "sourceArchivePath": info.filename,
                }
            )

    missing = [character_id for character_id, images in images_by_id.items() if not images]
    if missing:
        raise ValueError("Archive is missing characters: " + ", ".join(missing))

    for record in catalog:
        record["images"] = sorted(images_by_id[record["id"]], key=lambda image: image["filename"])
        record["assetSource"] = ""
        record["assetSourceLabel"] = "用户提供的聊天附件"
        record["assetSourceType"] = "user_provided_attachment"
        record["matchStatus"] = "角色名来自社区资料；图片来自用户提供的原图附件并按目录名对应"

    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n")
    inline = {}
    for record in catalog:
        inline[record["id"]] = {
            **record,
            "images": [
                {
                    **image,
                    "data": "data:"
                    + image["mime"]
                    + ";base64,"
                    + base64.b64encode((ROOT / "static" / image["path"]).read_bytes()).decode(),
                }
                for image in record["images"]
            ],
        }
    (ROOT / "static" / "reference-data.js").write_text(
        "window.CharacterReferences = " + json.dumps(inline, ensure_ascii=False) + ";\n"
    )
    print(
        f"Imported {sum(len(images) for images in images_by_id.values())} user originals "
        f"for {len(images_by_id)} characters"
    )


if __name__ == "__main__":
    main()
