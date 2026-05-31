# Debug Example (condensed)

**Mode**: debug  
Bug: button tap sometimes ignored on Android.

❌ Failure: guessing; patching with delay.

**Protocol**: reproduce → reduce → instrument → inspect → patch → prevent.

Root cause: overlay view intercepting touches during animation.
Fix: pointer-events/gesture hit testing; add regression UI test.
