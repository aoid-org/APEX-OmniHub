# IP FORTRESS — OMNIDEV-APEX Reference

## Every Novel Implementation: Document Immediately
File: `docs/ip-registry/YYYY-MM-DD-feature-name.md`

```markdown
# IP Registry Entry: [Feature Name]
Date: YYYY-MM-DD
Author: [name]
Status: Under Review | Filed | Granted | Trade Secret

## Problem
What exact problem does this solve?

## Prior Art
What existing solutions exist? Why are they insufficient?

## Novel Approach
What is technically novel about this solution?
Be specific: algorithm, data structure, architecture pattern, combination.

## Defensibility
- Novel: Yes/No — why?
- Non-obvious: Yes/No — why?
- Useful: Yes/No — measurable benefit?
- Technical: Yes/No — implemented in code?

## Patent Criteria Met: Yes/No
→ Yes: Flag for patent attorney review within 30 days
→ No: Protect as trade secret (access-controlled, not open-sourced)
```

## Trade Secret Protection
- Core algorithms: proprietary, internal access only, NOT open-sourced
- AI prompts: treated as IP — hashed + version-controlled + access-logged
- Architecture diagrams: internal only, watermarked, not in public repos
- Training data: owned + licensed, not scraped without rights

## IP Audit — Every Release
- [ ] New algorithms: documented in ip-registry
- [ ] Third-party licenses: compatible with commercial use (no GPL in core)
- [ ] Open-source contributions: reviewed by legal before merge
- [ ] Patents: attorney review queue checked
