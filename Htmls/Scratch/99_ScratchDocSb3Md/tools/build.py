"""把 src/generator.src.html 與內嵌的 JSZip 組成可離線使用的單一檔案。

用法：python tools/build.py
輸出：貓咪盃程式說明文件產生器.html，以及內容相同、部署到 GitHub 用的 CatCupGenDoc.html（專案根目錄）
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "generator.src.html"
JSZIP = ROOT / "src" / "jszip.inline.txt"
OUT = ROOT / "貓咪盃程式說明文件產生器.html"
DEPLOY = ROOT / "CatCupGenDoc.html"  # GitHub 上用的英文檔名


def main():
    html = SRC.read_text(encoding="utf-8")
    marker = "<!--JSZIP-->"
    if html.count(marker) != 1:
        raise SystemExit(f"原始檔裡的 {marker} 應該剛好出現一次")
    full = html.replace(marker, JSZIP.read_text(encoding="utf-8"))
    for out in (OUT, DEPLOY):
        out.write_text(full, encoding="utf-8")
        print(f"已輸出 {out.name}（{out.stat().st_size / 1024:.0f} KB）")


if __name__ == "__main__":
    main()
