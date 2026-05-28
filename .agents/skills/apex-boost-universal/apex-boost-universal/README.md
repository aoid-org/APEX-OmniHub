# APEX-BOOST v1.0 — Universal Edition
**Omnipotent AI performance amplifier. Works on ALL major models.**

---

## WHAT IT DOES

| Component | Function | Research Basis |
|---|---|---|
| **IAS** | Auto-selects reasoning depth (Tier 0–4) | Wei 2022 · Yao 2023 · Wang 2022 |
| **Antigravity Router** | Fires domain expert per task signal | Gemini 1.5 MoE · DeepMind 2024 |
| **TCE** | Compresses I/O 40–65%, no quality loss | SPR 2023 · LLMLingua 2023 |
| **4-Phase Protocol** | Scope → Skeleton → Execute → Verify | SoT 2023 · Constitutional AI 2022 |
| **Constitutional Gate** | Blocks unverified/incomplete output | Bai et al. 2022 · SELF-REFINE 2023 |
| **Anti-Drift Shield** | Halts loops, hedges, scope creep | APEX-POWER-20X pattern |

---

## COMPATIBLE MODELS

| Vendor | Models | Support Level |
|---|---|---|
| Anthropic | Claude 3.5, 4.x | ⭐⭐⭐ Full (use claude-edition) |
| OpenAI | GPT-4, GPT-4o, o1, o3 | ⭐⭐⭐ Full |
| Google | Gemini 1.5 Pro/Flash, 2.0 | ⭐⭐⭐ Full |
| Meta | Llama 3.1-405B, 3.2 | ⭐⭐⭐ Full |
| Meta | Llama 3-70B | ⭐⭐ Tier 1-3 |
| Mistral | Mistral-Large, Mixtral | ⭐⭐⭐ Full |
| DeepSeek | V2, V3, R1 | ⭐⭐⭐ Full |
| Cohere | Command-R+ | ⭐⭐ Tier 1-2 |
| Any LLM | Instruction-following | ⭐ Universal template |

---

## QUICK START

**1. Pick your template** from `templates/universal-injection.md`  
**2. Paste as system prompt** in your model interface or API call  
**3. Prepend `/apex-boost` to your first message**  

See `references/VENDOR-GUIDE.md` for per-model configuration.

---

## FILE STRUCTURE

```
apex-boost-universal/
├── SKILL.md                        ← Core protocol (all models)
├── meta.json                       ← Vendor compatibility matrix
├── references/
│   ├── CORE.md                     ← Full technique library
│   ├── PROTOCOLS.md                ← Velocity modes + domain protocols
│   ├── RUBRIC.md                   ← Quality scoring 0-100
│   ├── RESEARCH.md                 ← All citations
│   └── VENDOR-GUIDE.md             ← Per-vendor activation guide
└── templates/
    └── universal-injection.md      ← Copy-paste system prompts (all vendors)
```

---

## INSTALL (Claude users)

```bash
cp -r apex-boost-universal/ /mnt/skills/user/
# Then use: /apex-boost in any Claude conversation
```

## INSTALL (API / other models)

Copy relevant template from `templates/universal-injection.md` → paste as system prompt.

---

**Proprietary © 2026 APEX Business Systems Ltd. Edmonton, Alberta, Canada**
