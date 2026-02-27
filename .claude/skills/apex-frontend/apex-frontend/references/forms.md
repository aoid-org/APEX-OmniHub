# Forms & Validation

## Rules
- Label above input; placeholder is a hint, not a label.
- Validate progressively: on blur for fields; summary on submit.
- Preserve user input on errors.
- Provide examples (format hints) for complex fields.
- Disable submit during pending; prevent double-submit.

## Error UX
- Field-level error near the field
- Summary error at top if multiple
- Clear language: what + how to fix
- Use inline success sparingly

## Accessibility
- Associate errors with fields
- Announce errors on submit
- Ensure focus moves to first invalid field (web)
