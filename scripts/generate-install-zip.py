"""Create the installation ZIP with Python 3: python3 scripts/generate-install-zip.py."""

from pathlib import Path
import re
from tempfile import TemporaryDirectory
from zipfile import ZIP_DEFLATED, ZipFile


def main():
    root = Path(__file__).resolve().parent.parent
    readme = root / "README.md"
    version = re.search(
        r"^\*\*Версия:\*\* (\d+\.\d+\.\d+)\s*$",
        readme.read_text(encoding="utf-8"),
        re.MULTILINE,
    )
    if version is None:
        raise ValueError("Missing module version in README.md (expected **Версия:** X.Y.Z)")

    files = [root / name for name in (".shopifyignore", "install.pdf", "install-settings.txt", "README.md")]
    for name in ("assets", "snippets"):
        directory = root / name
        if not directory.is_dir():
            raise FileNotFoundError(f"Missing installation directory: {directory}")
        files.extend(sorted(path for path in directory.rglob("*") if path.is_file()))
    for path in files:
        if not path.is_file():
            raise FileNotFoundError(f"Missing installation file: {path}")

    dist = root / "dist"
    dist.mkdir(exist_ok=True)
    destination = dist / f"jet-shopify-{version.group(1)}.zip"
    # Keep the previous ZIP until its replacement has been written successfully.
    with TemporaryDirectory(prefix=".jet-shopify-", dir=dist) as temporary:
        archive = Path(temporary) / destination.name
        with ZipFile(archive, "w", compression=ZIP_DEFLATED) as output:
            for path in files:
                output.write(path, path.relative_to(root).as_posix())
        archive.replace(destination)

    for previous in dist.glob("jet-shopify-*.zip"):
        if previous != destination and previous.is_file():
            previous.unlink()
    print(f"Created: {destination}")


if __name__ == "__main__":
    main()
