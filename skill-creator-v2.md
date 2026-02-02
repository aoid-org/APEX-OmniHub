---
name: skill-creator-v2
description: "Elite skill engineering system that produces production-grade skills enabling 10x task performance. Triggers: create skill, build skill, make skill, new skill for [X], skill engineering, extend Claude capabilities, automate [workflow], package [expertise], optimize skill, improve skill. Produces skills with: zero-drift execution, first-pass success, deterministic scripts, cognitive scaffolding, failure pre-emption. Compatible with all LLMs (Claude, GPT, Gemini, Llama, Mistral)."
license: "Proprietary - APEX Business Systems Ltd. Edmonton, AB, Canada. https://apexbusiness-systems.com"
---

# Skill Creator v2

**Mission**: Produce skills that enable 10x task performance through first-pass success and zero-drift execution.

## The 10x Skill Formula

Skills that deliver 10x performance share these traits:

| Trait | What It Means | How to Achieve |
|-------|---------------|----------------|
| **Cognitive Scaffolding** | LLM knows exactly what to do at each step | Decision trees, not paragraphs |
| **Example-First** | Show the answer, don't describe it | Code blocks > prose |
| **Failure Pre-emption** | Anticipate mistakes before they happen | "NEVER do X" + "ALWAYS do Y" |
| **Deterministic Execution** | Same input → same output | Scripts for fragile operations |
| **Output Contracts** | Crystal clear success criteria | Input/Output specs at top |

## Quick Start

```bash
# 1. Initialize skill with elite template
python scripts/forge.py <skill-name> --path <dir>

# 2. Validate (MUST score 8.0+ to ship)
python scripts/audit.py <skill-path>

# 3. Package for distribution  
python scripts/ship.py <skill-path>
```

---

## Skill Architecture

```
skill-name/
├── SKILL.md              # Core instructions (aim for <300 lines)
├── scripts/              # Deterministic operations (fragile tasks)
├── references/           # Deep documentation (loaded on-demand)
└── assets/               # Templates, images (never loaded to context)
```

### The 3-Layer Context System

| Layer | Budget | Loaded When |
|-------|--------|-------------|
| **Frontmatter** | ~100 tokens | Always (triggers skill) |
| **SKILL.md body** | ~2000 tokens | On skill activation |
| **References** | Unlimited | On explicit need |

**Rule**: If SKILL.md > 300 lines, move content to `references/`.

---

## Writing Elite Skills

### Step 1: Define the Contract

Every skill starts with explicit Input/Output:

```markdown
## [Skill Name]

**Input**: [Exactly what user provides - file types, formats, parameters]
**Output**: [Exactly what skill produces - file types, location, format]
**Success**: [How to verify it worked]
```

### Step 2: Build Decision Trees (Not Paragraphs)

❌ **Bad**: Prose that requires interpretation
```markdown
When you need to edit a document, you should first consider whether 
you're creating a new document or editing an existing one. If you're 
creating new, you'll want to use the docx-js library...
```

✅ **Good**: Decision tree that directs action
```markdown
## Decision Tree

**Creating new document?** → Section A: Use docx-js  
**Editing existing document?** → Section B: Unpack/Edit/Repack  
**Reading content only?** → `pandoc file.docx -o output.md`
```

### Step 3: Show, Don't Tell (Example-First Design)

❌ **Bad**: Explaining what to do
```markdown
To create a table, you need to define the rows and cells, 
making sure to set the width properties correctly...
```

✅ **Good**: Showing what to do
```markdown
## Create Table

\`\`\`javascript
new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    new TableRow({ children: [
      new TableCell({ children: [new Paragraph("Cell 1")] })
    ]})
  ]
})
\`\`\`

**Critical**: Set `width` on both Table AND each TableCell.
```

### Step 4: Pre-empt Failures

List what goes wrong BEFORE showing the right way:

```markdown
## [Capability]

**Common Failures**:
- ❌ Using unicode bullets (breaks formatting)
- ❌ Missing `type` parameter on ImageRun
- ❌ Forgetting xml:space="preserve"

**Correct Approach**:
\`\`\`javascript
// Always use LevelFormat.BULLET, never "•" character
\`\`\`
```

### Step 5: Extract Scripts for Fragile Operations

**When to create a script**:
- Same code written repeatedly
- Syntax-sensitive operations (XML, regex)
- Multi-step transformations
- Operations requiring validation

**Script template**:
```python
#!/usr/bin/env python3
"""[Name] - [One-line purpose]. Exit: 0=success, 1=input error, 2=system error."""
import sys, argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    args = parser.parse_args()
    
    if not args.input.exists():
        print(f"❌ Not found: {args.input}", file=sys.stderr)
        sys.exit(1)
    
    # Do one thing well
    print(f"✅ Done: {args.input}")

if __name__ == "__main__":
    main()
```

---

## The Quality Rubric

Skills must score **8.0+** to ship. Run `python scripts/audit.py <path>`.

| Criterion | Weight | What It Measures |
|-----------|--------|------------------|
| **Trigger Clarity** | 15% | Description covers all activation phrases |
| **Cognitive Load** | 20% | Decision trees vs prose ratio |
| **Example Density** | 15% | Code examples per section |
| **Failure Coverage** | 15% | Pre-empted mistakes documented |
| **Script Quality** | 15% | Deterministic, validated, tested |
| **Token Efficiency** | 10% | Information per token |
| **Completeness** | 10% | All workflows documented |

---

## Anti-Patterns (Never Do These)

### ❌ The Explanation Trap
```markdown
# BAD: Telling Claude what it already knows
JSON is a data format. To parse JSON, you use JSON.parse()...
```

### ❌ The Prose Wall  
```markdown
# BAD: Paragraphs requiring interpretation
First consider what the user wants. Then think about the approach...
```

### ❌ The Kitchen Sink
```markdown
# BAD: Everything in SKILL.md
[500 lines of reference material that could be in references/]
```

### ❌ The Missing Contract
```markdown
# BAD: No clear input/output
## Edit Document
Edit the document as requested...
```

### ❌ The Optimistic Path
```markdown
# BAD: Only showing happy path
## Create PDF
pdf.save("output.pdf")  # What if this fails?
```

---

## Elite Patterns (Always Do These)

### ✅ Decision Tree Entry
```markdown
**What are you doing?**
- Creating new → Section A
- Editing existing → Section B  
- Converting format → Section C
```

### ✅ Contract Header
```markdown
**Input**: .docx file  
**Output**: .docx with tracked changes in /mnt/user-data/outputs/  
**Success**: Opens in Word with visible redlines
```

### ✅ Failure-First Documentation
```markdown
**Failures to avoid**:
- ❌ [Common mistake 1]
- ❌ [Common mistake 2]

**Correct**:
\`\`\`code
// The right way
\`\`\`
```

### ✅ Deterministic Scripts
```markdown
## Complex Operation

Don't write this manually. Use the script:
\`\`\`bash
python scripts/complex_op.py input.file --output result.file
\`\`\`
```

---

## Workflow: Create a New Skill

### 1. Initialize
```bash
python scripts/forge.py my-skill --path ./skills
```

### 2. Define Contract
Edit SKILL.md frontmatter with ALL trigger phrases:
```yaml
description: "[VERB] [domain]. Triggers: [phrase1], [phrase2], [phrase3]. Produces: [output type]."
```

### 3. Build Decision Tree
Start with the branching logic users will follow.

### 4. Add Examples
One code example per capability minimum.

### 5. Document Failures
What goes wrong? Pre-empt it.

### 6. Extract Scripts
Move fragile operations to `scripts/`.

### 7. Validate
```bash
python scripts/audit.py ./skills/my-skill
# Must score 8.0+ to proceed
```

### 8. Ship
```bash
python scripts/ship.py ./skills/my-skill
```

---

## References

- `references/patterns.md` - Complete pattern library with real examples
- `references/rubric.md` - Detailed scoring criteria
- `references/anti-patterns.md` - Comprehensive list of what to avoid
