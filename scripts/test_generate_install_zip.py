from pathlib import Path
import shutil
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest
from zipfile import ZipFile


class InstallZipTest(unittest.TestCase):
    def test_archive_contents_replacement_and_failed_build(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            script = root / "scripts" / "generate-install-zip.py"
            script.parent.mkdir()
            shutil.copyfile(Path(__file__).with_name(script.name), script)
            fixtures = {
                "README.md": "**Версия:** 2.0.2\n",
                ".shopifyignore": "dist/\n",
                "install.pdf": "%PDF-test fixture",
                "install-settings.txt": "{}",
                "assets/nested/икона.txt": "asset",
                "snippets/button.liquid": "snippet",
            }
            for name, content in fixtures.items():
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(content, encoding="utf-8")
            (root / "excluded.txt").write_text("not in archive")
            dist = root / "dist"
            dist.mkdir()
            old = dist / "jet-shopify-1.0.5.zip"
            old.write_bytes(b"previous archive")
            unrelated = dist / "other.zip"
            unrelated.write_bytes(b"keep")

            def run():
                return subprocess.run([sys.executable, str(script)], cwd="/tmp", capture_output=True)

            result = run()
            self.assertEqual(result.returncode, 0, result.stderr)
            archive = dist / "jet-shopify-2.0.2.zip"
            with ZipFile(archive) as output:
                self.assertIsNone(output.testzip())
                self.assertEqual(set(output.namelist()), set(fixtures))
                for name, content in fixtures.items():
                    self.assertEqual(output.read(name), content.encode("utf-8"))
            self.assertFalse(old.exists())
            self.assertEqual(unrelated.read_bytes(), b"keep")

            (root / "assets/nested/икона.txt").unlink()
            self.assertEqual(run().returncode, 0)
            with ZipFile(archive) as output:
                self.assertNotIn("assets/nested/икона.txt", output.namelist())

            (root / "README.md").write_text("**Версия:** 2.0.3\n", encoding="utf-8")
            self.assertEqual(run().returncode, 0)
            self.assertFalse(archive.exists())
            archive = dist / "jet-shopify-2.0.3.zip"
            previous = archive.read_bytes()
            for missing in ("install.pdf", "README.md"):
                with self.subTest(missing=missing):
                    path = root / missing
                    content = path.read_bytes()
                    path.unlink()
                    self.assertNotEqual(run().returncode, 0)
                    self.assertEqual(archive.read_bytes(), previous)
                    path.write_bytes(content)
            (root / "README.md").write_text("**Версия:** invalid\n", encoding="utf-8")
            self.assertNotEqual(run().returncode, 0)
            self.assertEqual(archive.read_bytes(), previous)
            self.assertEqual(unrelated.read_bytes(), b"keep")
            self.assertEqual({path.name for path in dist.iterdir()}, {archive.name, unrelated.name})


if __name__ == "__main__":
    unittest.main()
