"""Assemble using Python's standard library; browser assets include vendored Three.js."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PARTS = ("parts/start.html", "chapters/board.html", "chapters/observatory.html", "chapters/ending.html", "parts/end.html")

def build():
    content = "\n".join((ROOT / path).read_text() for path in PARTS)
    (ROOT / "index.html").write_text(content)
    print(f"Built index.html from {len(PARTS)} fragments.")

if __name__ == "__main__":
    build()
