import unittest
from pathlib import Path
TEXT='\n'.join(p.read_text(encoding='utf-8') for p in Path(__file__).resolve().parents[1].rglob('*.md'))
class Transition(unittest.TestCase):
    def test_sotp(self): self.assertIn('SOTP',TEXT)
    def test_capex_split(self): self.assertIn('Growth vs Maintenance CapEx',TEXT)
    def test_state_tree(self): self.assertIn('State Tree',TEXT)
    def test_transaction_anchor(self): self.assertIn('Transaction Anchor',TEXT)
    def test_model_conflict(self): self.assertIn('Model Conflict Review',TEXT)
    def test_real_option(self): self.assertIn('Real Option',TEXT)
if __name__=='__main__': unittest.main()
