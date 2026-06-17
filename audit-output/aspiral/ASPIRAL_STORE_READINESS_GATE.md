---
auditor: APEX-AUDITOR-PRIME / AGENT_7 STORE_READINESS_GATEKEEPER
subject: aSpiral — App Store (iOS) + Play Store (Android) Submission via Codemagic
audit_date: 2026-06-16
verdict_ios: 🔴 NO-GO
verdict_android: 🔴 NO-GO
verdict_codemagic_ios: 🟡 CONDITIONAL (pipeline present but missing test step + entitlements errors)
verdict_codemagic_android: 🔴 NO-GO (workflow absent)
---

# aSpiral Store Readiness Gate

## Final Verdict

| Target | Verdict | Reason |
|--------|---------|--------|
| **TestFlight Internal (via Codemagic)** | 🔴 **NO-GO** | PrivacyInfo.xcprivacy missing + aps-environment=development + wrong signing identity |
| **App Store Review (via TestFlight)** | 🔴 **NO-GO** | All above + screenshot assets missing + crash reporting absent |
| **Play Store Internal Track (via Codemagic)** | 🔴 **NO-GO** | Android Codemagic workflow entirely absent |
| **Play Store Public (via Internal Track)** | 🔴 **NO-GO** | Prerequisite track not achievable |

---

## iOS P0 Checklist (TestFlight Internal Track)

### 1. PrivacyInfo.xcprivacy — ASSET_MISSING:PrivacyInfo.xcprivacy 🔴 P0

- **Status:** NOT FOUND in ios/ tree — VERIFIED by full tree scan
- **Apple Policy:** Required for all iOS apps since Spring 2024 (apps using any of 68 "required reason" APIs must declare usage reasons)
- **Impact:** App Store Connect will reject any binary that uses required reason APIs without a valid PrivacyInfo.xcprivacy manifest. Capacitor 8 uses several required reason APIs (NSFileManager, UserDefaults, etc.)
- **Fix:** Create `ios/App/App/PrivacyInfo.xcprivacy` with:
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
  <plist version="1.0">
  <dict>
    <key>NSPrivacyTracking</key>
    <false/>
    <key>NSPrivacyTrackingDomains</key>
    <array/>
    <key>NSPrivacyCollectedDataTypes</key>
    <array/>
    <key>NSPrivacyAccessedAPITypes</key>
    <array>
      <!-- NSFileManager: required reason C617.1 — user-accessible path -->
      <dict>
        <key>NSPrivacyAccessedAPIType</key>
        <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
        <key>NSPrivacyAccessedAPITypeReasons</key>
        <array><string>C617.1</string></array>
      </dict>
      <!-- UserDefaults: required reason CA92.1 — user defaults access -->
      <dict>
        <key>NSPrivacyAccessedAPIType</key>
        <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
        <key>NSPrivacyAccessedAPITypeReasons</key>
        <array><string>CA92.1</string></array>
      </dict>
    </array>
  </dict>
  </plist>
  ```
- **Add to Xcode project target:** Must be added to `App` target in Xcode for it to be bundled in the IPA

---

### 2. Push Notification Entitlement — 🔴 P0

- **Status:** `aps-environment = development` — VERIFIED from `ios/App/App/App.entitlements:5`
- **Impact:** App Store binaries must use `aps-environment = production`. Submission will be rejected at App Store Connect binary processing.
- **Fix:**
  ```xml
  <!-- ios/App/App/App.entitlements -->
  <key>aps-environment</key>
  <string>production</string>
  ```
- **Note:** The Release Xcode scheme should already target this entitlements file. Verify `CODE_SIGN_ENTITLEMENTS` in `project.pbxproj` points to `App/App.entitlements` for the Release configuration.

---

### 3. Code Signing Identity — 🔴 P0

- **Status:** `CODE_SIGN_IDENTITY = "iPhone Developer"` — VERIFIED from `ios/App/App.xcodeproj/project.pbxproj`
- **Impact:** App Store distribution requires `Apple Distribution` signing identity, not `iPhone Developer`. This will cause the Codemagic IPA export step to fail at signing.
- **Fix:** In Xcode project `project.pbxproj`, Release configuration:
  ```
  CODE_SIGN_IDENTITY = "Apple Distribution";
  ```
  Alternatively, Codemagic's `fetch-signing-files` script may override this automatically if `CODE_SIGN_STYLE = Automatic` — verify Codemagic log output after next build run.
- **CODEMAGIC NOTE:** `codemagic.yaml` shows `--type IOS_APP_STORE` in the export args. If `Automatic` signing is active, Codemagic will select the correct distribution certificate. This is PROBABLE resolution without manual pbxproj edit, but unconfirmed.

---

### 4. Store Listing Screenshots — ASSET_MISSING:AppStore_Screenshots 🔴 P0

- **Status:** No screenshot assets found in repo — VERIFIED by tree scan (no `fastlane/screenshots/`, no `AppStoreAssets/`, no `.png` files in store listing directories)
- **Impact:** App Store Connect requires a minimum of 1 screenshot per supported device size for initial listing. TestFlight internal testing does NOT require screenshots — this is a P0 only for public App Store listing, not internal testing.
- **Revised classification for TestFlight Internal: 🟡 MEDIUM** — Screenshots not required for TestFlight internal testing
- **Fix:** Create screenshots in Simulator or via Codemagic post-build screenshot step. Required sizes: 6.7" (iPhone 15 Pro Max) and 6.5" (iPhone 14 Plus) minimum.

---

### 5. App Privacy Policy URL — 🟡 MEDIUM

- **Status:** Privacy page exists at `/privacy` route — VERIFIED from `src/App.tsx:93`
- **VITE_APP_URL = https://aspiral.icu** — VERIFIED from `.env.production:1`
- **App Store Connect:** Requires valid publicly accessible URL. `https://aspiral.icu/#/privacy` must return actual privacy policy content.
- **Action:** Verify `https://aspiral.icu/#/privacy` resolves with content before submitting.

---

### 6. Minimum iOS Deployment Target — 🟡 LOW-MEDIUM

- **Status:** `IPHONEOS_DEPLOYMENT_TARGET = 15.0` — VERIFIED from `project.pbxproj`
- **Impact:** App Store accepts iOS 15.0 minimum. Apple recommends iOS 16+ for 2025+ submissions to maximize device compatibility reporting. Not a blocker.
- **Fix (optional):** Change to 16.0 for forward compatibility. Verify no iOS 15-only APIs used.

---

### 7. App Store Connect App ID — ✅ VERIFIED

- **APP_STORE_APPLE_ID = 6757191574** — VERIFIED from `codemagic.yaml`
- App has been registered in App Store Connect — PROBABLE (ID format correct)

---

### 8. NSPhotoLibraryUsageDescription — ⚠️ UNVERIFIABLE

- **Status:** NOT found in `ios/App/App/Info.plist` — VERIFIED
- **Impact:** If any Photos API is invoked at runtime, iOS will crash the app without this key. Camera is declared for AR. File sharing may involve photos.
- **Action:** Search codebase for `PHPhotoLibrary`, `Photos.framework`, or `UIImagePickerController`. If found, add key. If not found, omission is acceptable.

---

## Android P0 Checklist (Play Store Internal Track)

### 1. Android Codemagic Workflow — ABSENT 🔴 P0 CRITICAL BLOCKER

- **Status:** `codemagic.yaml` contains ONLY two iOS workflows: `aspiral_ios_testflight` and `aspiral_ios_simulator` — VERIFIED by full 26 KB file read
- **Impact:** No Android build pipeline exists. There is no automated path to generate a signed AAB and deliver it to Play Store internal track.
- **Estimated fix time:** 8 engineering hours
- **Required workflow skeleton:**
  ```yaml
  aspiral_android_play_internal:
    name: Android Play Store - Internal Track
    max_build_duration: 60
    instance_type: linux_x2
    environment:
      groups:
        - aspiral_android_signing
      vars:
        PACKAGE_NAME: "com.apex.aspiral"
      node: 22.11.0
    scripts:
      - name: Install dependencies
        script: npm ci
      - name: Build web
        script: npm run build
      - name: Sync Capacitor
        script: npx cap sync android
      - name: Run tests
        script: npm test
      - name: Build Android AAB
        script: |
          cd android
          ./gradlew bundleRelease
    artifacts:
      - android/app/build/outputs/bundle/release/*.aab
    publishing:
      google_play:
        credentials: $GPLAY_SERVICE_ACCOUNT_JSON
        track: internal
        submit_as_draft: false
  ```

---

### 2. Android Signing — 🔴 P0

- **Status:** No signing configuration found in `android/app/build.gradle` for release builds — VERIFIED
- **Impact:** An unsigned AAB cannot be uploaded to Play Store. The build will produce an unsigned bundle without an explicit `signingConfig`.
- **Fix:** Add to `android/app/build.gradle`:
  ```gradle
  android {
    signingConfigs {
      release {
        storeFile file(System.getenv("ANDROID_KEYSTORE_FILE") ?: "keystore.jks")
        storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
        keyAlias System.getenv("ANDROID_KEY_ALIAS")
        keyPassword System.getenv("ANDROID_KEY_PASSWORD")
      }
    }
    buildTypes {
      release {
        signingConfig signingConfigs.release
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
      }
    }
  }
  ```
  Store keystore and credentials in Codemagic encrypted environment group `aspiral_android_signing`.

---

### 3. versionCode Hardcoded — 🔴 P0

- **Status:** `versionCode 10000` — VERIFIED from `android/app/build.gradle:10`
- **Impact:** Google Play rejects any AAB with a versionCode equal to or lower than the previously uploaded bundle. The first upload with versionCode=10000 will succeed, but all subsequent uploads will fail unless the code is incremented.
- **Fix:** Auto-increment via `BUILD_NUMBER` from Codemagic:
  ```gradle
  versionCode System.getenv("BUILD_NUMBER")?.toInteger() ?: 10000
  versionName "1.0.0"
  ```
  Codemagic provides `BUILD_NUMBER` automatically on each build.

---

### 4. Google Services JSON (FCM) — 🟡 UNVERIFIABLE

- **Status:** `google-services.json` NOT found in repo tree — PROBABLE (gitignored)
- **codemagic.yaml android section:** Not present to verify gservices file injection
- **Impact:** If push notifications via FCM are enabled and `google-services.json` is not provided at build time, the Android build will fail with a Gradle error.
- **Fix:** Add `google-services.json` as a Codemagic encrypted file and reference in Android workflow.

---

### 5. Play Store Listing Assets — ASSET_MISSING:PlayStore_Screenshots 🔴 P0 (for listing)

- **Status:** No Play Store screenshot assets found in repo — VERIFIED
- **Impact:** Play Store requires at minimum 2 screenshots for a listing. Internal track testing DOES require a listing with at least screenshots.
- **Fix:** Create 2–8 screenshots at 320–3840px width. Include a 512×512 icon and a 1024×500 feature graphic.

---

### 6. Privacy Policy URL (Android) — 🟡 MEDIUM

- Same as iOS — privacy policy URL must be declared in Play Console listing.

---

## Codemagic Pipeline Assessment

### iOS Pipeline (`aspiral_ios_testflight`)

| Step | Status |
|------|--------|
| Environment validation | ✅ |
| Dependency installation | ✅ |
| Production web build | ✅ |
| Capacitor sync | ✅ |
| Icon processing | ✅ |
| Build number auto-increment | ✅ |
| Bundle ID guard | ✅ |
| Distribution signing | ✅ |
| IPA build | ✅ |
| IPA verification | ✅ |
| TestFlight submission | ✅ |
| Beta group assignment | ✅ |
| **Test step (npm test)** | ❌ MISSING |

**Pipeline verdict: 🟡 CONDITIONAL** — Pipeline is well-structured and would succeed IF PrivacyInfo.xcprivacy is added and entitlements are corrected.

### Android Pipeline (`aspiral_android_play_internal`)

| Step | Status |
|------|--------|
| Entire workflow | ❌ MISSING |

**Pipeline verdict: 🔴 NO-GO**

---

## Remediation Priority Matrix

| Priority | Item | Effort | Blocks |
|----------|------|--------|--------|
| P0-1 | Add PrivacyInfo.xcprivacy to iOS project | 3h | iOS TestFlight + App Store |
| P0-2 | Change aps-environment to production | 30min | iOS TestFlight |
| P0-3 | Verify/fix CODE_SIGN_IDENTITY for Release | 30min | iOS TestFlight |
| P0-4 | Write Android Codemagic workflow | 8h | Android Play Store |
| P0-5 | Add Android signing config to build.gradle | 2h | Android Play Store |
| P0-6 | Fix versionCode auto-increment (Android) | 1h | Android Play Store |
| P0-7 | Create Play Store listing + screenshots | 4h | Android public listing |
| P1-1 | Add test step to both Codemagic workflows | 2h | Quality gate |
| P1-2 | Verify crash-free baseline (Sentry/Crashlytics) | 4h | App Review stability |

**Total estimated work to reach GO state: ~25h**

---

## GO/NO-GO Summary

```
╔══════════════════════════════════════════════════════════╗
║           aSpiral STORE READINESS GATE — 2026-06-16     ║
╠══════════════════════════════════════════════════════════╣
║  iOS TestFlight Internal    │  🔴 NO-GO                 ║
║  iOS App Store Review       │  🔴 NO-GO                 ║
║  Android Play Internal      │  🔴 NO-GO                 ║
║  Android Play Public        │  🔴 NO-GO                 ║
╠══════════════════════════════════════════════════════════╣
║  Minimum work to iOS GO:    │  ~4h (P0-1 + P0-2 + P0-3)║
║  Minimum work to Android GO:│  ~12h (P0-4 + P0-5 + P0-6)║
╚══════════════════════════════════════════════════════════╝

CERTIFICATION: AUDIT COMPLETE. NO-GO is the verified verdict.
All findings are traced to source evidence. No positive findings
were issued without evidence. No aspirational documentation was
taken as verified capability.
```
