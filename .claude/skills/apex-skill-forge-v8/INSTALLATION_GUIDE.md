# Installation Guide — APEX Skill Forge v8.0

**Version**: 8.0.0  
**Release Date**: 2026-02-16  
**Platform**: Universal (Claude, GPT-4, Gemini, OmniHub, Llama, Mistral, DeepSeek)

Three package formats. One skill system. Zero vendor lock-in.

## Format Comparison

| Feature              | Claude ZIP    | Universal ZIP | OmniHub ZIP   |
| -------------------- | ------------- | ------------- | ------------- |
| **Root doc**         | SKILL.md      | README.md     | README.md     |
| **Metadata**         | manifest.yaml | MANIFEST.json | MANIFEST.json |
| **YAML frontmatter** | ✅            | ❌            | ❌            |
| **DAG metadata**     | ✅            | ✅            | ✅            |
| **Installer script** | ❌            | ❌            | ✅            |
| **Health checks**    | ❌            | ❌            | ✅            |
| **DAG registry**     | ❌            | ❌            | ✅            |
| **LLM compat guide** | ❌            | ✅            | ✅            |
| **Size**             | ~25 KB        | ~24 KB        | ~31 KB        |
| **Target**           | Claude only   | Any LLM       | APEX OmniHub  |

## Installation Steps

### Claude Package (`apex-skill-forge-claude-v8.0.0.zip`)

1. Download `apex-skill-forge-claude-v8.0.0.zip` from `dist/`
2. Open Claude Settings > Capabilities > Upload skill
3. Select the ZIP file
4. Verify "apex-skill-forge" appears in Skills list
5. Test: type "forge skill data-transformer workflow"

### Universal Package (`apex-skill-forge-universal-v8.0.0.zip`)

1. Download `apex-skill-forge-universal-v8.0.0.zip` from `dist/`
2. Extract the ZIP
3. Read `LLM_COMPATIBILITY.md` for your specific LLM
4. Copy `README.md` into your LLM's system prompt or knowledge base
5. Test: "Apply the APEX Skill Forge protocol to create a data-transformer skill"

### OmniHub Package (`apex-skill-forge-omnihub-v8.0.0.zip`)

1. Download `apex-skill-forge-omnihub-v8.0.0.zip` from `dist/`
2. Extract the ZIP
3. Run the installer:
   ```bash
   python install_to_omnihub.py \
     --skill-path ./apex-skill-forge \
     --omnihub-root /path/to/APEX-OmniHub \
     --register-in-catalog
   ```
4. Verify health: `python skills/apex-skill-forge/omnihub_integration/health_checks.py`
5. Check catalog: `cat config/skill_catalog.json`

## Post-Installation Verification

```bash
# Test executor
python scripts/executor.py '{"parameters":{"action":"status"}}'

# Forge a test skill
python scripts/forge.py my-test-skill --arch workflow --path ./test-output

# Audit the test skill
python scripts/audit.py ./test-output/my-test-skill --verbose
```

---

**Copyright (c) 2026 APEX Business Systems Ltd. All Rights Reserved.**
