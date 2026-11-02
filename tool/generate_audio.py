import concurrent.futures as cf
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOK = ROOT / "assets/content/book.json"
OUT = ROOT / "assets/audio"
VOICE = "G17SuINrv2H9FC6nvetn"
MODEL = "eleven_v4"
FORMAT = "mp3_22050_32"
WORKERS = 3
MIN_CREDITS = 2000


def spoken(en: str) -> str:
    s = re.sub(r"\([^)]*\)", " ", en)
    s = re.sub(r"\b(\w+)/(\w+)\b", r"\1 or \2", s)
    s = s.replace(" / ", ", ").replace("/", ", ")
    s = re.sub(r"\s+", " ", s).strip(" ,;")
    return s


def file_id(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:12]


def api(path: str, key: str, body: dict | None = None):
    req = urllib.request.Request(
        "https://api.elevenlabs.io" + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"xi-api-key": key, "Content-Type": "application/json"},
        method="POST" if body is not None else "GET",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def credits_left(key: str) -> int:
    d = json.loads(api("/v1/user/subscription", key))
    return d["character_limit"] - d["character_count"]


def synth(text: str, key: str) -> tuple[str, str]:
    target = OUT / f"{file_id(text)}.mp3"
    if target.exists() and target.stat().st_size > 0:
        return text, "var"
    body = {"text": text, "model_id": MODEL, "language_code": "en", "seed": 7}
    for attempt in range(6):
        try:
            data = api(f"/v1/text-to-speech/{VOICE}?output_format={FORMAT}", key, body)
            tmp = target.with_suffix(".part")
            tmp.write_bytes(data)
            tmp.rename(target)
            return text, "yeni"
        except urllib.error.HTTPError as e:
            msg = e.read()[:300].decode("utf-8", "replace")
            if e.code in (429, 500, 502, 503, 504):
                time.sleep(2 + attempt * 3)
                continue
            return text, f"HATA {e.code} {msg}"
        except Exception as e:
            time.sleep(2 + attempt * 3)
            last = str(e)
    return text, f"HATA {last if 'last' in locals() else 'tekrar'}"


def main():
    key = os.environ["ELEVENLABS_API_KEY"]
    only_words = "--words" in sys.argv
    rows = json.loads(BOOK.read_text("utf-8"))["words"]
    texts = []
    seen = set()
    for r in sorted(rows, key=lambda r: r[5]):
        if only_words and r[5]:
            continue
        t = spoken(r[1])
        if t and t not in seen:
            seen.add(t)
            texts.append(t)
    OUT.mkdir(parents=True, exist_ok=True)
    index = {r[1]: file_id(spoken(r[1])) for r in rows if spoken(r[1]) and not (only_words and r[5])}
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")), "utf-8")

    todo = [t for t in texts if not (OUT / f"{file_id(t)}.mp3").exists()]
    print(f"toplam {len(texts)}, kalan {len(todo)}, kredi {credits_left(key)}", flush=True)
    done = 0
    errors = []
    started = time.time()
    for start in range(0, len(todo), 150):
        if credits_left(key) < MIN_CREDITS:
            print("kredi sınırına gelindi, duruldu", flush=True)
            break
        chunk = todo[start : start + 150]
        with cf.ThreadPoolExecutor(WORKERS) as pool:
            for text, status in pool.map(lambda t: synth(t, key), chunk):
                done += 1
                if status.startswith("HATA"):
                    errors.append((text, status))
                    print(f"{text} -> {status}", flush=True)
        rate = done / max(1, time.time() - started)
        print(f"{done}/{len(todo)}  hata {len(errors)}  kredi {credits_left(key)}  ~{(len(todo) - done) / max(rate, 0.01) / 60:.0f} dk kaldı", flush=True)
    (OUT.parent / "audio-errors.json").write_text(json.dumps(errors, ensure_ascii=False, indent=1), "utf-8") if errors else None
    print(f"bitti: {done} işlendi, {len(errors)} hata", flush=True)


if __name__ == "__main__":
    main()
