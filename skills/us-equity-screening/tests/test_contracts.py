import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
TEXT='\n'.join(p.read_text(encoding='utf-8') for p in ROOT.rglob('*.md'))
class Contracts(unittest.TestCase):
    def test_si_short_volume_distinct(self): self.assertIn('Short Interest',TEXT); self.assertIn('Short Volume',TEXT); self.assertIn('绝不允许',TEXT)
    def test_13f_delay(self): self.assertIn('13F',TEXT); self.assertIn('滞后',TEXT)
    def test_gex_assumption(self): self.assertIn('GEX',TEXT); self.assertIn('dealer',TEXT.lower())
    def test_fuel_trigger(self): self.assertIn('Fuel',TEXT); self.assertIn('Trigger',TEXT); self.assertIn('高SI本身不是Trigger',TEXT)
    def test_long_unwind(self): self.assertIn('Long unwind',TEXT); self.assertIn('多杀多',TEXT)
    def test_two_sided(self): self.assertIn('two_sided_crowded',TEXT)
    def test_missing_unknown(self): self.assertTrue('UNKNOWN' in TEXT or 'unknown' in TEXT)
    def test_crowding_not_intrinsic(self): self.assertIn('不会因为Short Interest高就自动提高内在价值',TEXT)
    def test_call_oi_not_proof(self): self.assertIn('Call OI',TEXT); self.assertIn('不证明',TEXT)
    def test_short_volume_not_float(self): self.assertIn('55%的float被做空',TEXT)
if __name__=='__main__': unittest.main()
