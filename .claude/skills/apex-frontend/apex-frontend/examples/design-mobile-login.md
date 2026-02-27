# Example: Design a Mobile Login

## Contract
- Platform: mobile
- Goal: user signs in successfully within 30s
- States: loading/error/offline/forgot password

## Flow
1) Open app → see login
2) Enter email/password
3) Tap “Sign in”
4) Success → home

## Wireframe (ASCII)
[Header: Welcome back]
[Email __________________]
[Password _______________] (eye)
[Sign in]  (primary)
[Forgot password?]
[Continue with Apple] [Continue with Google]
[Create account]

## State table
| State | UI | Recovery |
|---|---|---|
| Loading | Button shows spinner, disabled | Auto |
| Error (invalid) | Inline under field + summary | Fix input |
| Offline | Banner “You’re offline” | Retry |

## Acceptance criteria
- [ ] Tapping Sign in while loading does nothing (no double submit)
- [ ] Screen reader announces field labels and errors
- [ ] Password field supports show/hide and autofill
