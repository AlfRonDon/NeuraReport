import os
import unittest
from unittest import mock

from backend import api as api_module
from backend.app.services.templates import TemplateVerify


class NormalizeMappingTests(unittest.TestCase):
    def test_norm_placeholder_wraps_plain_labels(self):
        """Plain headers should be wrapped in curly braces for placeholders."""
        self.assertEqual(api_module._norm_placeholder("Amount Due"), "{Amount Due}")
        self.assertEqual(api_module._norm_placeholder(" amount "), "{amount}")

    def test_norm_placeholder_preserves_existing_tokens(self):
        """Existing {token} or {{token}} placeholders are left untouched."""
        self.assertEqual(api_module._norm_placeholder("{Total}"), "{Total}")
        self.assertEqual(api_module._norm_placeholder("{{GrandTotal}}"), "{{GrandTotal}}")

    def test_normalize_mapping_for_autofill_builds_expected_list(self):
        mapping = {
            "Amount": "orders.total",
            "   {Name}  ": "UNRESOLVED",
            "Notes": "INPUT_SAMPLE",
        }
        normalized = api_module._normalize_mapping_for_autofill(mapping)
        self.assertEqual(
            normalized,
            [
                {"header": "Amount", "placeholder": "{Amount}", "mapping": "orders.total"},
                {"header": "   {Name}  ", "placeholder": "{Name}", "mapping": "UNRESOLVED"},
                {"header": "Notes", "placeholder": "{Notes}", "mapping": "INPUT_SAMPLE"},
            ],
        )


class TemplateVerifyClientTests(unittest.TestCase):
    def tearDown(self):
        TemplateVerify._client = None

    def test_missing_api_key_raises(self):
        TemplateVerify._client = None
        fake_openai = mock.Mock()
        with mock.patch.object(TemplateVerify, "OpenAI", fake_openai):
            with mock.patch.dict(os.environ, {}, clear=True):
                with self.assertRaisesRegex(RuntimeError, "OPENAI_API_KEY"):
                    TemplateVerify.get_openai_client()

    def test_client_cached_and_configured_once(self):
        TemplateVerify._client = None
        fake_client = object()
        fake_openai = mock.Mock(return_value=fake_client)
        with mock.patch.object(TemplateVerify, "OpenAI", fake_openai):
            with mock.patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}, clear=True):
                first = TemplateVerify.get_openai_client()
                second = TemplateVerify.get_openai_client()
        self.assertIs(first, fake_client)
        self.assertIs(second, fake_client)
        fake_openai.assert_called_once_with(api_key="test-key")


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
