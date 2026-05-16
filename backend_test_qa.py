"""
Lovli Backend QA Test Suite - Iteration 2
Focused regression testing for recent changes.
"""
import base64
import io
import json
import os
import sys
import time
from datetime import datetime

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


class LovliQATester:
    def __init__(self):
        self.base_url = BASE_URL
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_results = []

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
            result = {
                "name": name,
                "method": method,
                "endpoint": endpoint,
                "expected_status": expected_status,
                "actual_status": response.status_code,
                "success": success,
                "response_preview": response.text[:200] if not success else "OK"
            }
            self.test_results.append(result)

            if success:
                self.tests_passed += 1
                self.log(f"PASS: {name} (status {response.status_code})", "PASS")
                return True, response
            else:
                self.failed_tests.append(
                    f"{name}: Expected {expected_status}, got {response.status_code}"
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
            self.test_results.append({
                "name": name,
                "method": method,
                "endpoint": endpoint,
                "expected_status": expected_status,
                "actual_status": "ERROR",
                "success": False,
                "response_preview": str(e)
            })
            return False, None

    def create_test_image(self) -> bytes:
        """Create a small valid PNG test image with visual features"""
        img = Image.new("RGB", (200, 200), color=(255, 255, 255))
        # Add some visual features (not uniform)
        from PIL import ImageDraw
        draw = ImageDraw.Draw(img)
        draw.rectangle([50, 50, 150, 150], fill=(73, 109, 137))
        draw.ellipse([75, 75, 125, 125], fill=(200, 100, 50))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()

    def run_all_tests(self):
        """Run comprehensive QA test suite"""
        self.log("=" * 60)
        self.log("LOVLI BACKEND QA TEST SUITE - ITERATION 2")
        self.log("=" * 60)

        # 1. Health check
        self.log("\n[1] HEALTH CHECK", "INFO")
        self.test("GET /api/", "GET", "", 200)

        # 2. Auth - Login with test user
        self.log("\n[2] AUTH - LOGIN", "INFO")
        success, resp = self.test(
            "POST /api/auth/login (happy path)",
            "POST",
            "auth/login",
            200,
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        )
        if success and resp:
            data = resp.json()
            self.token = data.get("access_token")
            self.user_id = data.get("user", {}).get("id")
            self.log(f"Got JWT token for user {self.user_id}", "INFO")
        else:
            self.log("CRITICAL: Cannot login with test user. Stopping tests.", "FAIL")
            return

        # 3. Auth - Login with wrong password (must return string detail)
        self.log("\n[3] AUTH - LOGIN WRONG PASSWORD", "INFO")
        success, resp = self.test(
            "POST /api/auth/login (wrong password)",
            "POST",
            "auth/login",
            401,
            json={"email": TEST_EMAIL, "password": "WrongPassword123"},
        )
        if success and resp:
            detail = resp.json().get("detail")
            if isinstance(detail, str):
                self.log(f"✓ Detail is string: '{detail}'", "PASS")
            else:
                self.log(f"✗ Detail is not string: {type(detail)} - {detail}", "FAIL")

        # 4. Auth - Signup with invalid email (422 test)
        self.log("\n[4] AUTH - SIGNUP INVALID EMAIL (422 TEST)", "INFO")
        success, resp = self.test(
            "POST /api/auth/signup (invalid email)",
            "POST",
            "auth/signup",
            422,
            json={"name": "Test", "email": "not-an-email", "password": "Pass123!"},
        )
        if success and resp:
            detail = resp.json().get("detail")
            self.log(f"422 detail type: {type(detail)}", "INFO")
            if isinstance(detail, list):
                self.log(f"✓ Detail is array (Pydantic validation): {len(detail)} errors", "PASS")
            else:
                self.log(f"Detail: {detail}", "INFO")

        # 5. Auth - Signup with valid data
        self.log("\n[5] AUTH - SIGNUP VALID", "INFO")
        new_email = f"qa_{int(time.time())}@lovli.test"
        success, resp = self.test(
            "POST /api/auth/signup (valid)",
            "POST",
            "auth/signup",
            200,
            json={"name": "QA User", "email": new_email, "password": "QAPass@123"},
        )
        if success and resp:
            data = resp.json()
            self.log(f"Created user: {data.get('user', {}).get('email')}", "INFO")

        # 6. Google OAuth config
        self.log("\n[6] GOOGLE OAUTH CONFIG", "INFO")
        success, resp = self.test(
            "GET /api/auth/google/config",
            "GET",
            "auth/google/config",
            200,
        )
        if success and resp:
            config = resp.json()
            self.log(f"Google enabled: {config.get('enabled')}", "INFO")
            self.log(f"Client ID: {config.get('client_id')[:20]}...", "INFO")

        # 7. Auth - Get current user
        self.log("\n[7] AUTH - GET ME", "INFO")
        success, resp = self.test(
            "GET /api/auth/me (with valid JWT)",
            "GET",
            "auth/me",
            200,
        )
        if success and resp:
            user = resp.json()
            self.log(f"User: {user.get('email')}", "INFO")

        # 8. Settings update
        self.log("\n[8] SETTINGS UPDATE", "INFO")
        success, resp = self.test(
            "PATCH /api/settings (name, platform, language, timezone)",
            "PATCH",
            "settings",
            200,
            json={
                "name": "Lovli QA Tester",
                "preferred_platform": "instagram",
                "language_preference": "Hinglish",
                "timezone": "Asia/Kolkata",
            },
        )

        # 9. Onboarding
        self.log("\n[9] ONBOARDING", "INFO")
        success, resp = self.test(
            "PATCH /api/auth/onboarding",
            "PATCH",
            "auth/onboarding",
            200,
            json={
                "preferred_platform": "dating_platform",
                "language_preference": "English",
                "timezone": "Asia/Kolkata",
            },
        )

        # 10. Usage
        self.log("\n[10] USAGE", "INFO")
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
                f"Usage: {usage.get('daily_generation_count')}/{usage.get('daily_limit')} (limit={usage.get('daily_limit')})",
                "INFO",
            )
            if usage.get('daily_limit') != 8:
                self.log(f"✗ Expected daily_limit=8, got {usage.get('daily_limit')}", "FAIL")

        # 11. Generate replies - text only (manual_text)
        self.log("\n[11] GENERATE REPLIES - TEXT ONLY", "INFO")
        success, resp = self.test(
            "POST /api/generate-replies (manual_text only)",
            "POST",
            "generate-replies",
            200,
            data={
                "platform": "instagram",
                "vibe": "Playful",
                "language": "English",
                "manual_text": "Her: What's your favorite food?",
                "client_local_date": today,
                "timezone": "Asia/Kolkata",
            },
        )
        generation_id = None
        if success and resp:
            data = resp.json()
            generation_id = data.get("generation_id")
            replies = data.get("replies", [])
            tone_notes = data.get("tone_notes", "")
            daily_count = data.get("daily_generation_count")
            self.log(f"✓ Got {len(replies)} replies", "PASS")
            self.log(f"✓ generation_id: {generation_id}", "PASS")
            self.log(f"✓ tone_notes: {tone_notes[:50]}...", "PASS")
            self.log(f"✓ daily_generation_count: {daily_count}", "PASS")
            if len(replies) != 3:
                self.log(f"✗ Expected 3 replies, got {len(replies)}", "FAIL")

        # 12. Generate replies - with image
        self.log("\n[12] GENERATE REPLIES - WITH IMAGE", "INFO")
        test_image = self.create_test_image()
        success, resp = self.test(
            "POST /api/generate-replies (with image)",
            "POST",
            "generate-replies",
            200,
            data={
                "platform": "dating_platform",
                "vibe": "Confident",
                "language": "Hinglish",
                "client_local_date": today,
                "timezone": "Asia/Kolkata",
            },
            files={"image": ("test.png", test_image, "image/png")},
        )
        if success and resp:
            data = resp.json()
            self.log(f"✓ Got {len(data.get('replies', []))} replies", "PASS")

        # 13. Generate replies - different platforms and languages
        self.log("\n[13] GENERATE REPLIES - PLATFORM & LANGUAGE VARIANTS", "INFO")
        
        # Instagram + Hinglish
        success, resp = self.test(
            "POST /api/generate-replies (instagram + Hinglish)",
            "POST",
            "generate-replies",
            200,
            data={
                "platform": "instagram",
                "vibe": "Flirty",
                "language": "Hinglish",
                "manual_text": "Her: Coffee?",
                "client_local_date": today,
                "timezone": "Asia/Kolkata",
            },
        )

        # WhatsApp + English
        success, resp = self.test(
            "POST /api/generate-replies (whatsapp + English)",
            "POST",
            "generate-replies",
            200,
            data={
                "platform": "whatsapp",
                "vibe": "Sincere",
                "language": "English",
                "manual_text": "Her: How was your day?",
                "client_local_date": today,
                "timezone": "Asia/Kolkata",
            },
        )

        # 14. Memory CRUD
        self.log("\n[14] MEMORY CARDS - CRUD", "INFO")
        
        # List memory cards
        success, resp = self.test(
            "GET /api/memory-cards (list)",
            "GET",
            "memory-cards",
            200,
        )
        
        # Create memory card
        success, resp = self.test(
            "POST /api/memory-cards (create)",
            "POST",
            "memory-cards",
            200,
            json={
                "nickname": "QA Test Person",
                "goal": "dating",
                "current_situation": "texting",
                "likes": "coffee, books",
                "notes": "Met at a bookstore",
            },
        )
        memory_card_id = None
        if success and resp:
            card = resp.json()
            memory_card_id = card.get("id")
            self.log(f"✓ Created memory card: {memory_card_id}", "PASS")
        
        # Update memory card
        if memory_card_id:
            success, resp = self.test(
                "PATCH /api/memory-cards/{id} (update)",
                "PATCH",
                f"memory-cards/{memory_card_id}",
                200,
                json={
                    "nickname": "QA Test Person Updated",
                    "dislikes": "loud places",
                },
            )
        
        # Delete memory card
        if memory_card_id:
            success, resp = self.test(
                "DELETE /api/memory-cards/{id} (delete)",
                "DELETE",
                f"memory-cards/{memory_card_id}",
                200,
            )

        # 15. Generate replies with memory_card_id
        self.log("\n[15] GENERATE REPLIES - WITH MEMORY", "INFO")
        # First create a memory card
        success, resp = self.test(
            "POST /api/memory-cards (for generation test)",
            "POST",
            "memory-cards",
            200,
            json={
                "nickname": "Memory Test",
                "goal": "friendship",
                "likes": "hiking",
            },
        )
        if success and resp:
            card = resp.json()
            mem_id = card.get("id")
            # Generate with memory
            success, resp = self.test(
                "POST /api/generate-replies (with memory_card_id)",
                "POST",
                "generate-replies",
                200,
                data={
                    "platform": "instagram",
                    "vibe": "Playful",
                    "language": "English",
                    "manual_text": "Her: Weekend plans?",
                    "memory_card_id": mem_id,
                    "client_local_date": today,
                    "timezone": "Asia/Kolkata",
                },
            )

        # 16. Waitlist
        self.log("\n[16] WAITLIST", "INFO")
        
        # Pro waitlist
        success, resp = self.test(
            "POST /api/waitlist (type=pro)",
            "POST",
            "waitlist",
            200,
            json={
                "email": f"qa_pro_{int(time.time())}@lovli.test",
                "type": "pro",
                "payload": {"interest": "unlimited generations"},
                "source": "pro_page",
            },
        )
        
        # Memory waitlist
        success, resp = self.test(
            "POST /api/waitlist (type=memory)",
            "POST",
            "waitlist",
            200,
            json={
                "email": f"qa_memory_{int(time.time())}@lovli.test",
                "type": "memory",
                "payload": {"feature": "advanced memory"},
            },
        )

        # 17. Feedback
        self.log("\n[17] FEEDBACK", "INFO")
        if generation_id:
            # Feedback with copied_reply_index
            success, resp = self.test(
                "POST /api/feedback (copied_reply_index)",
                "POST",
                "feedback",
                200,
                json={
                    "generation_id": generation_id,
                    "copied_reply_index": 1,
                },
            )
            
            # Feedback with textual feedback
            success, resp = self.test(
                "POST /api/feedback (textual feedback)",
                "POST",
                "feedback",
                200,
                json={
                    "generation_id": generation_id,
                    "feedback": "Great replies!",
                },
            )

        # 18. Daily limit check (verify limit=8, don't exhaust)
        self.log("\n[18] DAILY LIMIT VERIFICATION", "INFO")
        success, resp = self.test(
            "GET /api/usage (verify limit)",
            "GET",
            f"usage?client_local_date={today}",
            200,
        )
        if success and resp:
            usage = resp.json()
            limit = usage.get('daily_limit')
            count = usage.get('daily_generation_count')
            self.log(f"Current: {count}/{limit}", "INFO")
            if limit == 8:
                self.log(f"✓ Daily limit is 8 (correct)", "PASS")
            else:
                self.log(f"✗ Daily limit is {limit}, expected 8", "FAIL")
            if count < 8:
                self.log(f"✓ Not exhausted ({count}/8)", "PASS")
            else:
                self.log(f"⚠️ Daily limit exhausted or close ({count}/8)", "WARN")

        # Summary
        self.log("\n" + "=" * 60)
        self.log("TEST SUMMARY")
        self.log("=" * 60)
        self.log(f"Total tests: {self.tests_run}")
        self.log(f"Passed: {self.tests_passed}")
        self.log(f"Failed: {len(self.failed_tests)}")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"Success rate: {success_rate:.1f}%")

        if self.failed_tests:
            self.log("\nFAILED TESTS:", "FAIL")
            for i, test in enumerate(self.failed_tests, 1):
                self.log(f"{i}. {test}", "FAIL")
        else:
            self.log("\n🎉 ALL TESTS PASSED!", "PASS")

        self.log("=" * 60)
        
        return {
            "total": self.tests_run,
            "passed": self.tests_passed,
            "failed": len(self.failed_tests),
            "success_rate": success_rate,
            "failed_tests": self.failed_tests,
            "test_results": self.test_results,
        }


if __name__ == "__main__":
    tester = LovliQATester()
    results = tester.run_all_tests()
    
    # Save results to JSON
    with open("/tmp/backend_qa_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    sys.exit(0 if results["failed"] == 0 else 1)
