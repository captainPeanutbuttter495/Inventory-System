from django.test import TestCase

class HelloViewTests(TestCase):
    def test_root_returns_alive_message(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Inventory app is alive")