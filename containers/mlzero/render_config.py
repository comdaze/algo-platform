"""Render an MLZero config from the installed default.yaml by patching the single
`llm: &default_llm` anchor to the OpenAI-compatible endpoint. All agent sections
use `<<: *default_llm`, so patching the anchor propagates to every agent.
"""
import importlib.util
import os
import re


def render(model_id: str, proxy_url: str, out_path: str = "/tmp/mlzero_config.yaml") -> str:
    spec = importlib.util.find_spec("autogluon.assistant")
    base = os.path.join(os.path.dirname(spec.origin), "configs", "default.yaml")
    s = open(base).read()
    # Only the uncommented anchor lines match (commented #provider: openai stays).
    s = re.sub(r"^\s*provider:\s*bedrock\s*$", "  provider: openai", s, flags=re.M)
    s = re.sub(r'^\s*model:\s*"us\.anthropic.*$', f"  model: {model_id}", s, flags=re.M)
    s = re.sub(r"^\s*proxy_url:\s*null\s*$", f"  proxy_url: {proxy_url}", s, flags=re.M)
    # gpt-5 family requires temperature=1.
    s = re.sub(r"temperature:\s*[0-9.]+", "temperature: 1.0", s)
    open(out_path, "w").write(s)
    return out_path


if __name__ == "__main__":
    import sys
    print(render(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "/tmp/mlzero_config.yaml"))
