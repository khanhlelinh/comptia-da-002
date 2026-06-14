import os
# --- APP CONFIG ---
CONFIG_FILE = "config.json"  # <--- Bổ sung dòng này
# --- MODEL LIST ---
OLLAMA_MODELS = [
    "qwen3.5:397b-cloud", "deepseek-v4-pro:cloud", "glm-5.1:cloud",
    "kimi-k2.6:cloud", "gemma4:latest", "gemma3:27b-cloud",
    "deepseek-v3.2:cloud", "devstral-2:123b-cloud", "qwen3-vl:235b-cloud",
    "minimax-m2.7:cloud", "nemotron-3-super:cloud", "glm-5:cloud", "kimi-k2.5:cloud"
]
DEFAULT_MODEL = "qwen3.5:397b-cloud"

# --- OLLAMA HOST CONFIG ---
# Local Ollama server
OLLAMA_LOCAL_HOSTS = ["127.0.0.1", "legion-laptop", "DESKTOP-0A1VDGF"]
DEFAULT_PORT = "11434"

# Ollama Cloud endpoint (cập nhật nếu có endpoint chính thức từ Ollama)
OLLAMA_CLOUD_HOST = "https://ollama.cloud"  # Hoặc endpoint cụ thể của bạn
OLLAMA_CLOUD_API_KEY = os.getenv("OLLAMA_CLOUD_API_KEY", "")  # API key nếu cần

# Build danh sách host cho dropdown
OLLAMA_HOST_LIST = [f"{h}:{DEFAULT_PORT}" for h in OLLAMA_LOCAL_HOSTS] + ["ollama.cloud"]
DEFAULT_OLLAMA_HOST = f"http://{OLLAMA_LOCAL_HOSTS[0]}:{DEFAULT_PORT}"