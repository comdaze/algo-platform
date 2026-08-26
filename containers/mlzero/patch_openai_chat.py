"""Bake-time patch for autogluon.assistant's OpenAI provider (v1.0.0).

Two bugs make a China / custom OpenAI-compatible endpoint unusable for model
VALIDATION (the chat path already honors proxy_url):
  1. get_openai_models() builds `OpenAI()` with no base_url -> hits api.openai.com
     (unreachable from AWS China) -> [] -> "Invalid model".
  2. it filters ids to gpt-3.5/gpt-4/o1/o3 -> a custom model id (e.g.
     openai.gpt-5.6-sol) is dropped even if reachable.
This rewrites get_openai_models to use OPENAI_BASE_URL and return all ids.
"""
import importlib.util

spec = importlib.util.find_spec("autogluon.assistant.llm.openai_chat")
path = spec.origin
src = open(path).read()

src = src.replace(
    'return [model.id for model in models if model.id.startswith(("gpt-3.5", "gpt-4", "o1", "o3"))]',
    "return [model.id for model in models]",
)
src = src.replace(
    "client = OpenAI()",
    'client = OpenAI(base_url=os.environ.get("OPENAI_BASE_URL"))',
)
open(path, "w").write(src)

ok = 'os.environ.get("OPENAI_BASE_URL")' in src and "startswith((" not in src.split("get_openai_models", 1)[-1][:400]
print("patched openai_chat.py at", path, "->", "OK" if ok else "CHECK")
