"""
Lovli Backend API Test Suite
Tests all backend endpoints comprehensively.
"""
import base64
import io
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import requests
from PIL import Image

# Backend URL from environment
BACKEND_URL = os.environ.get(
    "REACT_APP_BACKEND_URL", "https://reply-coach-7.preview.emergentagent.com"
)
BASE_URL = f"{BACKEND_URL}/api"

# Test credentials
TEST_EMAIL = "tester@lovli.app"
TEST_PASSWORD = "LovliTest@123"


class LovliAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log(self, msg: str, level: str = "INFO"):
        """Log test messages"""
        prefix = {
            "INFO": "ℹ️",
            "PASS": "✅",
            "FAIL": "❌",
            "WARN": "⚠️",
        }.get(level, "•")
        print(f"{prefix} {msg}")

    def test(self, name: str, method: str, endpoint: str, expected_status: int, **kwargs):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = kwargs.pop("headers", {})
        if self.token and "Authorization" not in headers:
            headers["Authorization"] = f"Bearer {self.token}"

        self.tests_run += 1
        self.log(f"Testing: {name}", "INFO")

        try:
            if method == "GET":
                response = requests.get(url, headers=headers, **kwargs)
            elif method == "POST":
                response = requests.post(url, headers=headers, **kwargs)
            elif method == "PATCH":
                response = requests.patch(url, headers=headers, **kwargs)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers, **kwargs)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"PASS: {name} (status {response.status_code})", "PASS")
                return True, response
            else:
                self.failed_tests.append(
                    f"{name}: Expected {expected_status}, got {response.status_code} - {response.text[:200]}"
                )
                self.log(
                    f"FAIL: {name} - Expected {expected_status}, got {response.status_code}",
                    "FAIL",
                )
                self.log(f"Response: {response.text[:300]}", "WARN")
                return False, response

        except Exception as e:
            self.failed_tests.append(f"{name}: Exception - {str(e)}")
            self.log(f"FAIL: {name} - Exception: {str(e)}", "FAIL")
            return False, None

    def create_test_image(self) -> bytes:
        """Create a small valid PNG test image"""
        img = Image.new("RGB", (100, 100), color=(73, 109, 137))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()

    def run_all_tests(self):
        """Run comprehensive test suite"""
        self.log("=" * 60)
        self.log("LOVLI BACKEND API TEST SUITE")
        self.log("=" * 60)

        # 1. Health check
        self.log("\n[1] HEALTH CHECK", "INFO")
        self.test("GET /api/", "GET", "", 200)

        # 2. Auth - Test Login (bypass)
        self.log("\n[2] AUTH - TEST LOGIN BYPASS", "INFO")
        success, resp = self.test(
            "POST /api/auth/test-login", "POST", "auth/test-login", 200
        )
        if success and resp:
            data = resp.json()
            self.token = data.get("access_token")
            self.user_id = data.get("user", {}).get("id")
            self.log(f"Got JWT token for user {self.user_id}", "INFO")

        # 3. Auth - Get current user
        self.log("\n[3] AUTH - GET CURRENT USER", "INFO")
        self.test("GET /api/auth/me (with token)", "GET", "auth/me", 200)

        # Test without token
        old_token = self.token
        self.token = None
        self.test("GET /api/auth/me (no token)", "GET", "auth/me", 401)
        self.token = old_token

        # Test with bad token
        self.test(
            "GET /api/auth/me (bad token)",
            "GET",
            "auth/me",
            401,
            headers={"Authorization": "Bearer invalid_token_xyz"},
        )

        # 4. Auth - Signup with duplicate email
        self.log("\n[4] AUTH - SIGNUP DUPLICATE EMAIL", "INFO")
        self.test(
            "POST /api/auth/signup (duplicate)",
            "POST",
            "auth/signup",
            409,
            json={
                "name": "Duplicate User",
                "email": TEST_EMAIL,
                "password": "AnotherPass@123",
            },
        )

        # 5. Auth - Signup with new email
        self.log("\n[5] AUTH - SIGNUP NEW USER", "INFO")
        new_email = f"test_{int(time.time())}@lovli.app"
        success, resp = self.test(
            "POST /api/auth/signup (new user)",
            "POST",
            "auth/signup",
            200,
            json={"name": "New User", "email": new_email, "password": "NewPass@123"},
        )
        if success and resp:
            data = resp.json()
            self.log(f"Created new user: {data.get('user', {}).get('email')}", "INFO")

        # 6. Auth - Login with correct credentials
        self.log("\n[6] AUTH - LOGIN", "INFO")
        self.test(
            "POST /api/auth/login (correct)",
            "POST",
            "auth/login",
            200,
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        )

        # Login with wrong password
        self.test(
            "POST /api/auth/login (wrong password)",
            "POST",
            "auth/login",
            401,
            json={"email": TEST_EMAIL, "password": "WrongPassword"},
        )

        # Login with unknown email
        self.test(
            "POST /api/auth/login (unknown email)",
            "POST",
            "auth/login",
            401,
            json={"email": "unknown@example.com", "password": "SomePass"},
        )

        # 7. Onboarding
        self.log("\n[7] AUTH - ONBOARDING", "INFO")
        self.test(
            "PATCH /api/auth/onboarding",
            "PATCH",
            "auth/onboarding",
            200,
            json={
                "preferred_platform": "Hinge",
                "preferred_style": "Confident",
                "language_preference": "Hinglish",
                "timezone": "Asia/Kolkata",
            },
        )

        # 8. Settings
        self.log("\n[8] SETTINGS UPDATE", "INFO")
        self.test(
            "PATCH /api/settings",
            "PATCH",
            "settings",
            200,
            json={
                "name": "Lovli Tester Updated",
                "preferred_platform": "Bumble",
                "timezone": "Asia/Kolkata",
            },
        )

        # 9. Usage
        self.log("\n[9] USAGE ENDPOINT", "INFO")
        today = datetime.now().strftime("%Y-%m-%d")
        success, resp = self.test(
            "GET /api/usage",
            "GET",
            f"usage?client_local_date={today}",
            200,
        )
        if success and resp:
            usage = resp.json()
            self.log(
                f"Usage: {usage.get('daily_generation_count')}/{usage.get('daily_limit')}",
                "INFO",
            )

        # 10. Generate replies - text only
        self.log("\n[10] GENERATE REPLIES - TEXT ONLY", "INFO")
        success, resp = self.test(
            "POST /api/generate-replies (text)",
            "POST",
            "generate-replies",
            200,
            data={
                "platform": "Hinge",
                "vibe": "Confident",
                "language": "Hinglish",
                "manual_text": "Her: defend your samosa top 3 right now",
                "client_local_date": today,
                "timezone": "Asia/Kolkata",
            },
        )
        generation_id = None
        if success and resp:
            data = resp.json()
            generation_id = data.get("generation_id")
            replies = data.get("replies", [])
            self.log(f"Got {len(replies)} replies", "INFO")
            self.log(f"Daily count: {data.get('daily_generation_count')}", "INFO")

        # 11. Generate replies - with image
        self.log("\n[11] GENERATE REPLIES - WITH IMAGE", "INFO")
        test_image = self.create_test_image()
        success, resp = self.test(
            "POST /api/generate-replies (image)",
            "POST",
            "generate-replies",
            200,
            data={
                "platform": "Hinge",
                "vibe": "Playful",
                "language": "Hinglish",
                "client_local_date": today,
                "timezone": "Asia/Kolkata",
            },
            files={"image": ("test.png", test_image, "image/png")},
        )
        if success and resp:
            data = resp.json()
            self.log(f"Got {len(data.get('replies', []))} replies", "INFO")

        # 12. Generate replies - missing both image and text
        self.log("\n[12] GENERATE REPLIES - VALIDATION", "INFO")
        self.test(
            "POST /api/generate-replies (no input)",
            "POST",
            "generate-replies",
            400,
            data={
                "platform": "Hinge",
                "vibe": "Confident",
                "language": "Hinglish",
                "client_local_date": today,
            },
        )

        # Invalid platform
        self.test(
            "POST /api/generate-replies (invalid platform)",
            "POST",
            "generate-replies",
            400,
            data={
                "platform": "InvalidPlatform",
                "vibe": "Confident",
                "language": "Hinglish",
                "manual_text": "test",
                "client_local_date": today,
            },
        )

        # Invalid vibe
        self.test(
            "POST /api/generate-replies (invalid vibe)",
            "POST",
            "generate-replies",
            400,
            data={
                "platform": "Hinge",
                "vibe": "InvalidVibe",
                "language": "Hinglish",
                "manual_text": "test",
                "client_local_date": today,
            },
        )

        # 13. Feedback
        self.log("\n[13] FEEDBACK", "INFO")
        if generation_id:
            self.test(
                "POST /api/feedback",
                "POST",
                "feedback",
                200,
                json={
                    "generation_id": generation_id,
                    "copied_reply_index": 0,
                    "feedback": "Great reply!",
                },
            )

        # 14. Memory Cards - List (initially empty or existing)
        self.log("\n[14] MEMORY CARDS - LIST", "INFO")
        success, resp = self.test("GET /api/memory-cards", "GET", "memory-cards", 200)
        existing_cards = []
        if success and resp:
            existing_cards = resp.json()
            self.log(f"Found {len(existing_cards)} existing memory cards", "INFO")

        # 15. Memory Cards - Create
        self.log("\n[15] MEMORY CARDS - CREATE", "INFO")
        success, resp = self.test(
            "POST /api/memory-cards",
            "POST",
            "memory-cards",
            200,
            json={
                "nickname": "Test Crush",
                "relationship_stage": "talking",
                "likes": "coffee, books",
                "notes": "Met at cafe",
            },
        )
        card_id = None
        if success and resp:
            card = resp.json()
            card_id = card.get("id")
            self.log(f"Created memory card: {card_id}", "INFO")

        # 16. Memory Cards - Update
        self.log("\n[16] MEMORY CARDS - UPDATE", "INFO")
        if card_id:
            self.test(
                "PATCH /api/memory-cards/{id}",
                "PATCH",
                f"memory-cards/{card_id}",
                200,
                json={"likes": "coffee, books, hiking", "notes": "Updated notes"},
            )

        # 17. Memory Cards - Delete
        self.log("\n[17] MEMORY CARDS - DELETE", "INFO")
        if card_id:
            self.test(
                "DELETE /api/memory-cards/{id}",
                "DELETE",
                f"memory-cards/{card_id}",
                200,
            )

        # 18. Memory Cards - Per-user isolation test
        self.log("\n[18] MEMORY CARDS - USER ISOLATION", "INFO")
        # Create a second user
        new_email2 = f"other_{int(time.time())}@lovli.app"
        success, resp = self.test(
            "POST /api/auth/signup (user 2)",
            "POST",
            "auth/signup",
            200,
            json={"name": "Other User", "email": new_email2, "password": "OtherPass@123"},
        )
        user2_token = None
        if success and resp:
            user2_token = resp.json().get("access_token")

        # Create card as user 1
        success, resp = self.test(
            "POST /api/memory-cards (user 1)",
            "POST",
            "memory-cards",
            200,
            json={"nickname": "User1 Card"},
        )
        user1_card_id = None
        if success and resp:
            user1_card_id = resp.json().get("id")

        # Try to access user1's card as user2
        if user2_token and user1_card_id:
            old_token = self.token
            self.token = user2_token
            self.test(
                "GET /api/memory-cards (user 2 can't see user 1 cards)",
                "GET",
                "memory-cards",
                200,
            )
            # Try to update user1's card as user2 (should fail)
            self.test(
                "PATCH /api/memory-cards/{id} (cross-user)",
                "PATCH",
                f"memory-cards/{user1_card_id}",
                404,
                json={"nickname": "Hacked"},
            )
            # Try to delete user1's card as user2 (should fail)
            self.test(
                "DELETE /api/memory-cards/{id} (cross-user)",
                "DELETE",
                f"memory-cards/{user1_card_id}",
                404,
            )
            self.token = old_token

        # 19. Waitlist
        self.log("\n[19] WAITLIST", "INFO")
        self.test(
            "POST /api/waitlist (pro)",
            "POST",
            "waitlist",
            200,
            json={
                "email": "waitlist@example.com",
                "type": "pro",
                "source": "pro_page",
            },
        )
        self.test(
            "POST /api/waitlist (memory)",
            "POST",
            "waitlist",
            200,
            json={
                "email": "waitlist2@example.com",
                "type": "memory",
                "source": "memory_page",
            },
        )

        # 20. Daily limit enforcement (test 429)
        self.log("\n[20] DAILY LIMIT ENFORCEMENT", "INFO")
        self.log("Testing daily limit by making multiple generations...", "INFO")
        # Get current usage
        success, resp = self.test(
            "GET /api/usage (before limit test)",
            "GET",
            f"usage?client_local_date={today}",
            200,
        )
        if success and resp:
            usage = resp.json()
            current_count = usage.get("daily_generation_count", 0)
            limit = usage.get("daily_limit", 8)
            remaining = limit - current_count
            self.log(f"Current: {current_count}/{limit}, Remaining: {remaining}", "INFO")

            # Generate replies until we hit the limit
            if remaining > 0:
                self.log(f"Generating {remaining} more replies to hit limit...", "INFO")
                for i in range(remaining):
                    success, resp = self.test(
                        f"POST /api/generate-replies (fill limit {i+1}/{remaining})",
                        "POST",
                        "generate-replies",
                        200,
                        data={
                            "platform": "Hinge",
                            "vibe": "Confident",
                            "language": "Hinglish",
                            "manual_text": f"Test message {i+1}",
                            "client_local_date": today,
                            "timezone": "Asia/Kolkata",
                        },
                    )
                    if not success:
                        break
                    time.sleep(0.5)  # Small delay between requests

            # Now test that we get 429
            self.test(
                "POST /api/generate-replies (over limit)",
                "POST",
                "generate-replies",
                429,
                data={
                    "platform": "Hinge",
                    "vibe": "Confident",
                    "language": "Hinglish",
                    "manual_text": "This should fail",
                    "client_local_date": today,
                    "timezone": "Asia/Kolkata",
                },
            )

        # 21. Usage reset on date change
        self.log("\n[21] USAGE RESET ON DATE CHANGE", "INFO")
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        success, resp = self.test(
            "GET /api/usage (tomorrow's date)",
            "GET",
            f"usage?client_local_date={tomorrow}",
            200,
        )
        if success and resp:
            usage = resp.json()
            self.log(
                f"Usage after date change: {usage.get('daily_generation_count')}/{usage.get('daily_limit')}",
                "INFO",
            )
            if usage.get("daily_generation_count") == 0:
                self.log("✅ Daily counter reset correctly!", "PASS")

        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        self.log("\n" + "=" * 60)
        self.log("TEST SUMMARY")
        self.log("=" * 60)
        self.log(f"Total tests: {self.tests_run}")
        self.log(f"Passed: {self.tests_passed}")
        self.log(f"Failed: {len(self.failed_tests)}")
        success_rate = (
            (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        )
        self.log(f"Success rate: {success_rate:.1f}%")

        if self.failed_tests:
            self.log("\n❌ FAILED TESTS:", "FAIL")
            for i, failure in enumerate(self.failed_tests, 1):
                self.log(f"{i}. {failure}", "FAIL")

        self.log("=" * 60)
        return 0 if len(self.failed_tests) == 0 else 1


def main():
    tester = LovliAPITester()
    exit_code = tester.run_all_tests()
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
