import unittest
from pathlib import Path
TEXT='\n'.join(p.read_text(encoding='utf-8') for p in Path(__file__).resolve().parents[1].rglob('*.md'))
class Screening(unittest.TestCase):
    def test_no_si_rank(self): self.assertIn('高SI只是Fuel',TEXT); self.assertIn('拥挤度不得成为单独买入排名',TEXT)
    def test_coverage(self): self.assertIn('coverage',TEXT.lower())
if __name__=='__main__': unittest.main()
