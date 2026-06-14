import re
import json
import os
import ollama
from typing import Dict, Optional
from config.settings import DEFAULT_OLLAMA_HOST, OLLAMA_CLOUD_HOST, OLLAMA_CLOUD_API_KEY

class PDFQuestionExtractor:
    def __init__(self, model: str, host: str = None):
        self.model = model
        self.host = host or DEFAULT_OLLAMA_HOST
        self.is_cloud = "cloud" in model or "ollama.cloud" in host
        
        # Cấu hình client cho cloud hoặc local
        if self.is_cloud:
            # Ollama Cloud: dùng endpoint riêng + API key nếu có
            self.client = ollama.Client(
                host=OLLAMA_CLOUD_HOST if "ollama.cloud" in host else host,
                headers={"Authorization": f"Bearer {OLLAMA_CLOUD_API_KEY}"} if OLLAMA_CLOUD_API_KEY else {}
            )
        else:
            # Local: set env var để ollama lib kết nối đúng
            os.environ["OLLAMA_HOST"] = self.host
            self.client = ollama.Client(host=self.host)

        self.prompt = """You are a professional exam data extraction assistant. Extract the SINGLE question from the PDF text below.
Return ONLY a valid JSON object with this exact structure, NO markdown, NO code blocks, NO extra text:
{{"q_num": integer, "q_text": "question content", "options": "A. ... B. ... C. ... D. ...", "answer": "correct letter", "exp_en": "explanation", "exp_vi": "Vietnamese translation"}}
If no question found, return: {{"q_num": null}}
Return raw JSON only.

TEXT:
{raw_text}"""

    def _clean_json(self, raw: str) -> dict:
        try:
            print(f"\n📝 Raw response (first 200 chars): {raw[:200]}...")
            cleaned = re.sub(r'^```(?:json)?\s*|\s*```$', '', raw.strip(), flags=re.MULTILINE | re.DOTALL)
            json_match = re.search(r'\{[\s\S]*\}', cleaned)
            if json_match:
                cleaned = json_match.group(0)
            print(f"🔍 Cleaned JSON (first 200 chars): {cleaned[:200]}...")
            result = json.loads(cleaned)
            if not isinstance(result, dict) or "q_num" not in result:
                print(f"⚠️ Missing 'q_num' key. Available keys: {list(result.keys()) if isinstance(result, dict) else 'N/A'}")
                return {"q_num": None, "q_text": "", "options": "", "answer": "", "exp_en": "", "exp_vi": ""}
            return result
        except json.JSONDecodeError as e:
            print(f"❌ JSON Decode Error: {e}")
            print(f"❌ Problematic text: {cleaned[:300]}")
            return {"q_num": None, "q_text": "", "options": "", "answer": "", "exp_en": raw[:200], "exp_vi": "Parse lỗi"}
        except Exception as e:
            print(f"❌ Unexpected error: {type(e).__name__}: {e}")
            return {"q_num": None, "q_text": "", "options": "", "answer": "", "exp_en": raw[:200], "exp_vi": "Error"}

    def extract(self, page_text: str) -> Optional[Dict]:
        try:
            safe_text = page_text.replace("{", "{{").replace("}", "}}")
            # Dùng client đã khởi tạo thay vì gọi ollama.chat trực tiếp
            res = self.client.chat(
                model=self.model,
                messages=[{"role": "user", "content": self.prompt.format(raw_text=safe_text)}],
                options={"temperature": 0.1, "num_ctx": 8192}
            )
            raw_content = res["message"]["content"]
            return self._clean_json(raw_content)
        except Exception as e:
            print(f"⚠️ Lỗi gọi Ollama tại {self.host}: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            return None