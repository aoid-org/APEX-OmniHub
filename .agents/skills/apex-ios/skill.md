---
name: apex-ios
description: "Executes enterprise-grade iOS architecture, Fastlane CI/CD deployments, and Match code signing. Triggers: ios deployment, fastlane beta, xcode build failed, certificate expired, testflight upload, match signing error, swiftui architecture."
version: "1.2.1"
last_updated: "2026-04-09"
archetype: "workflow"
platform: "google-antigravity"
license: "Proprietary - APEX Business Systems Ltd."
---

# APEX-iOS Release Director

**Input**: iOS feature request, CI/CD YAML adjustment, or Code Signing/Match failure logs.
**Output**: Executable Swift code, deterministic Fastlane commands, or direct Xcode configurations.
**Success**: Crash-free rate > 99.5%, zero signing errors on CI, automated TestFlight promotion.
**Fails When**: Fabricating Apple policies, omitting `PrivacyInfo.xcprivacy`, or running CI without `readonly: true`.

---

## 🏛️ APEX PROPRIETARY LICENSE
**Copyright © 2026 APEX Business Systems Ltd. All Rights Reserved.**
This software is proprietary and confidential. Internal use only. Public distribution, unauthorized modification, or redistribution is strictly prohibited.

---

## Decision Tree

**What is the precise iOS objective?**
├─ Code / Architecture → Use "Swift/SwiftUI Architecture"
├─ CI/CD & Fastlane → Use "Pipeline Orchestration"
└─ Build / Signing Debug → Use "Code Signing (Match) Recovery"

---

## Pipeline Orchestration (Fastlane/CI)

**Failures to avoid**:
- ❌ CI generating new certificates → Invalidates existing profiles for all team members.
- ❌ Hardcoding secrets → Use GitHub Actions/Codemagic environment variables.

**Correct approach**:
```ruby
# Fastfile snippet - CI MUST NEVER regenerate certs
lane :beta do
  setup_ci if ENV["CI"]
  match(type: "appstore", readonly: true) # CRITICAL SAFETY LOCK
  increment_build_number(build_number: ENV["BUILD_NUMBER"])
  build_app(scheme: "MyApp-Prod", export_method: "app-store")
  upload_to_testflight(skip_waiting_for_build_processing: false)
end
Code Signing (Match) Recovery
Failures to avoid:

❌ Guessing provisioning paths → Force local regeneration first.

❌ Missing Privacy Manifests → iOS 17+ requires PrivacyInfo.xcprivacy for UserDefaults and system APIs.

Correct approach:
| Error Message | Fix |
|---|---|
| No profiles for '...' were found | Run bundle exec fastlane match appstore --force locally. |
| Code signing is required | Set CODE_SIGN_STYLE = Manual in build settings. |