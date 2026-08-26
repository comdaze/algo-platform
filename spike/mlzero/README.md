# MLZero (AutoGluon Assistant) — Phase 0 探路 / Spike

目标:在 **AWS 中国宁夏区**用一台 **GPU 实例** + **OpenAI 兼容 LLM 端点**，验证 MLZero 端到端能出结果。**通过后**再做平台集成（容器化 + Web UI 内嵌）。

## 为什么这样做（中国区关键点）
- MLZero 默认用 **Bedrock**，宁夏区**不可用**。
- 源码 `llm/openai_chat.py`：`openai_api_base = config.proxy_url`，key 读环境变量 `OPENAI_API_KEY`，`model` 读配置。
- 所以走 **`--provider openai` + 自定义 `proxy_url`**（OpenAI 兼容端点：通义 DashScope-compatible / DeepSeek / 智谱 / 自建 vLLM）。
- 映射（与平台「设置」页一致）：`Endpoint URL → proxy_url`，`Model ID → model`，`API Key → OPENAI_API_KEY`。

## 步骤
1. 起一台 GPU 实例（g4dn.xlarge / g5.xlarge 探路足够；深度学习任务再上更大或 H20），**Deep Learning AMI**（自带 NVIDIA 驱动）最省事。cn-northwest-1。
2. SSH 上去，拷贝本目录（`spike/mlzero/`）。
3. `bash setup.sh`（装 uv + 从源码装 mlzero；用阿里云 pip 镜像）。
4. 设环境变量并运行：
   ```bash
   export LLM_ENDPOINT_URL="https://<你的 OpenAI 兼容端点>/v1"
   export LLM_MODEL_ID="<model id>"
   export OPENAI_API_KEY="<key>"
   bash run.sh /path/to/dataset-dir       # 例如一份风功率样本数据目录
   ```

## 验收标准（通过才进 Phase 1）
- [ ] MLZero 能连上 LLM 端点（无 401/超时）。
- [ ] agent 能自动写代码、跑训练，**产出模型/方案**且流程不中断。
- [ ] 记录：单次耗时、GPU 利用率、token 消耗、产物位置。

## 安全（务必）
- MLZero **会执行 LLM 生成的代码** → 探路机要**强隔离**：独立 SG、最小 IAM（探路阶段最好不挂任何敏感角色）、限制出网、跑完即**终止实例**（省钱 + 降风险）。
- 官方也建议在 **Docker 容器**里跑（多一层隔离）：仓库根有 Dockerfile，`docker build -t mlzero:latest .` 后 `docker run --gpus all --shm-size=32g ...`。

## 之后（Phase 1，通过后再做）
- 容器化 MLZero + 其 Web UI → 内网 ALB → nginx 反代 `/mlzero/` → 平台左侧「AutoML 助手」iframe（与 Grafana/MLflow 同套路）。
- 运行时后端从 Secrets Manager 取 `algo/llm/config`（平台「设置」页写入的 Endpoint/Model/Key）渲染出 `custom_config.yaml` 注入容器。
- 数据从 S3 进；产物注册 MLflow / 存 artifact bucket。
