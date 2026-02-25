# Mobile Release Checklist

1. Build web assets:
   - `bun run build`
2. Sync Capacitor shells:
   - `npx cap sync`
3. Open native projects:
   - `npx cap open ios`
   - `npx cap open android`
4. Provide signing assets out-of-repo:
   - Apple Distribution cert + provisioning profile
   - Android keystore + alias password

Do not commit certificates, provisioning profiles, keystores, or passwords.
