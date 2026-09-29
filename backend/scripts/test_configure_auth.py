import contextlib
import importlib.util
import io
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('configure_auth', Path(__file__).with_name('configure-auth.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ConfigurationTests(unittest.TestCase):
    def setUp(self):
        self.config = patch.object(module, 'local_config', return_value={
            'SUPABASE_URL': 'https://testproject.supabase.co',
            'SUPABASE_PUBLISHABLE_KEY': 'sb_publishable_fixture'})
        self.config.start()
        self.addCleanup(self.config.stop)

    def test_default_is_read_only(self):
        with patch.object(sys, 'argv', ['configure-auth.py']), patch.object(module, 'request', return_value={'mailer_autoconfirm': False}) as request, contextlib.redirect_stdout(io.StringIO()):
            module.main()
        request.assert_called_once_with('https://testproject.supabase.co/auth/v1/settings', {'apikey': 'sb_publishable_fixture'})

    def test_apply_changes_only_confirmation_and_does_not_print_token(self):
        output = io.StringIO()
        with patch.object(sys, 'argv', ['configure-auth.py', '--apply-immediate-registration']), patch.dict(os.environ, {'SUPABASE_ACCESS_TOKEN': 'sbp_private_fixture'}), patch.object(module, 'request', side_effect=[{'mailer_autoconfirm': False}, {'mailer_autoconfirm': True}, {'mailer_autoconfirm': True}]) as request, contextlib.redirect_stdout(output):
            module.main()
        self.assertEqual(request.call_args_list[1].args, (
            'https://api.supabase.com/v1/projects/testproject/config/auth',
            {'Authorization': 'Bearer sbp_private_fixture', 'Content-Type': 'application/json'},
            {'mailer_autoconfirm': True}))
        self.assertNotIn('sbp_private_fixture', output.getvalue())
        self.assertEqual(request.call_count, 3)

    def test_publishable_key_cannot_change_configuration(self):
        with patch.object(sys, 'argv', ['configure-auth.py', '--apply-immediate-registration']), patch.dict(os.environ, {'SUPABASE_ACCESS_TOKEN': 'sb_publishable_fixture'}), patch.object(module, 'request', return_value={'mailer_autoconfirm': False}) as request, contextlib.redirect_stdout(io.StringIO()), self.assertRaises(ValueError):
            module.main()
        self.assertEqual(request.call_count, 1)

    def test_already_enabled_does_not_write(self):
        with patch.object(sys, 'argv', ['configure-auth.py', '--apply-immediate-registration']), patch.object(module, 'request', return_value={'mailer_autoconfirm': True}) as request, contextlib.redirect_stdout(io.StringIO()):
            module.main()
        self.assertEqual(request.call_count, 1)

    def test_unconfirmed_management_response_fails(self):
        with patch.object(sys, 'argv', ['configure-auth.py', '--apply-immediate-registration']), patch.dict(os.environ, {'SUPABASE_ACCESS_TOKEN': 'sbp_private_fixture'}), patch.object(module, 'request', return_value={'mailer_autoconfirm': False}), contextlib.redirect_stdout(io.StringIO()), self.assertRaises(ValueError):
            module.main()


if __name__ == '__main__':
    unittest.main()
