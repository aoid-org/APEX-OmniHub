# LLM Compatibility Guide — APEX Skill Forge v8.0

This guide covers how to use APEX Skill Forge skills across different LLM platforms.

## Claude (Anthropic)

### As Uploaded Skill (Recommended)

1. Package: `python scripts/ship.py . --format claude`
2. Open Claude Settings > Capabilities
3. Click "Upload skill" and select the ZIP
4. Skills auto-activate on matching trigger phrases

### As Project Knowledge

1. Copy `SKILL.md` content into Claude Project instructions
2. Claude will follow the skill protocol automatically

### In Claude Code

```bash
# Forge a skill directly in your project
python scripts/forge.py my-new-skill --arch workflow --path ./skills
```

---

## GPT-4 / GPT-4o (OpenAI)

### As Custom Instructions

1. Extract `README.md` from the universal ZIP
2. Paste into Custom Instructions or system prompt
3. GPT-4 will follow the skill protocol

### As GPT Action

1. Create a Custom GPT
2. Add README.md content to the GPT's instructions
3. Users invoke via natural conversation

### As File Upload

1. Upload README.md to a conversation
2. Prompt: "Follow the apex-skill-forge instructions to create a skill for [X]"

---

## Gemini (Google)

### In Google AI Studio

1. Create a new System Instruction
2. Paste README.md content
3. Gemini will detect and follow the skill protocol

### In Gemini Code Assist

1. Add README.md to Project knowledge
2. Reference in prompts: "Use the APEX Skill Forge protocol"

### Via Vertex AI

1. Include README.md in the system prompt of your Vertex AI model
2. Skills will be recognized from trigger phrases

---

## APEX OmniHub (Direct Integration)

### Automated Installation

```bash
python install_to_omnihub.py \
  --skill-path ./my-skill \
  --omnihub-root /path/to/APEX-OmniHub \
  --register-in-catalog
```

### What Happens

1. Skill files copied to `skills/<name>/`
2. Health check validates executor compatibility
3. Skill registered in `config/skill_catalog.json`
4. Example DAG workflow generated in `dag/`

### Verification

```bash
# Check health
python skills/my-skill/omnihub_integration/health_checks.py

# View catalog entry
cat config/skill_catalog.json | python -m json.tool

# Test execution
python skills/my-skill/scripts/executor.py '{"parameters":{"action":"status"}}'
```

---

## Llama (Meta)

### Via Ollama

1. Include README.md in your system prompt
2. Invoke: "Follow the APEX Skill Forge protocol to [task]"

### Via vLLM / Text Generation Inference

1. Inject README.md as system context in your API call
2. The model will follow the structured protocol

---

## Mistral AI

### Via Le Chat

1. Paste README.md content into conversation
2. Request: "Apply this skill forge protocol to create a skill for [X]"

### Via Mistral API

1. Set README.md as system message
2. User messages trigger skill creation naturally

---

## DeepSeek

### Via DeepSeek Chat

1. Paste README.md in the conversation start
2. DeepSeek will follow the structured protocol

### Via API

1. Include README.md as the system prompt
2. Works identically to other API-based models

---

## Universal Pattern (Any LLM)

For any LLM not listed above:

1. **Extract** README.md from the universal ZIP
2. **Inject** the content as system prompt or context
3. **Invoke** with: "Apply this protocol to: [your skill request]"
4. **Validate** output against the 12-dimension audit

### Executor Integration

```python
# Any Python environment can use the executor directly
from scripts.executor import execute

result = execute({
    "execution_id": "run-001",
    "parameters": {"action": "status"},
    "context": {},
    "metadata": {}
})
print(result)
```

---

**Copyright (c) 2026 APEX Business Systems Ltd. All Rights Reserved.**
