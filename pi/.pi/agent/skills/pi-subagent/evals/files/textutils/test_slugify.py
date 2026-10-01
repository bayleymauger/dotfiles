import unittest

from slugify import slugify


class SlugifyTest(unittest.TestCase):
    def test_basic(self):
        self.assertEqual(slugify("Hello World"), "hello-world")

    def test_accents(self):
        self.assertEqual(slugify("Crème Brûlée"), "creme-brulee")

    def test_trims_hyphens(self):
        self.assertEqual(slugify("  --Hello, World!--  "), "hello-world")

    def test_max_length_does_not_end_in_hyphen(self):
        self.assertEqual(slugify("one two three", max_length=8), "one-two")


if __name__ == "__main__":
    unittest.main()
