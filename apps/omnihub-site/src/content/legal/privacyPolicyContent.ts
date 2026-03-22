const privacyPolicyContent = `# Privacy Policy

**Effective Date:** 2026-03-22

## 1. Introduction

APEX Business Systems Ltd. ("APEX", "we", "our", "us"), the developer and operator of aSpiral and the APEX OmniHub platform, is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you access or use the aSpiral application, the APEX OmniHub platform, and any related services (collectively, the "Service"). This policy applies to all users worldwide, including those protected under the General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA), the Canadian Personal Information Protection and Electronic Documents Act (PIPEDA), and Alberta's Personal Information Protection Act (PIPA).

By using the Service, you acknowledge that you have read and understood this Privacy Policy.

## 2. Data Controller

- **Entity:** APEX Business Systems Ltd.
- **Jurisdiction:** Alberta, Canada
- **Privacy Contact:** privacy@apexomnihub.icu

For GDPR purposes, APEX Business Systems Ltd. acts as the Data Controller for all personal data processed through the Service.

## 3. Information We Collect

### Personal Information You Provide

- **Account Information:** Name, email address, and authentication credentials managed through our authentication provider (Supabase Auth).
- **Profile Information:** Optional display name, organization name, and role information.
- **Support Data:** Information you provide when contacting support, including support tickets and incident notes.
- **Request Access Submissions:** Name, email, company, and use case details submitted through our access request form.

### Information Collected Automatically

- **Usage Data:** Feature usage patterns, API call frequency, and performance metrics collected via our internal OmniSentry monitoring system.
- **Device Information:** Device type, operating system, browser type, and hardware identifiers used for zero-trust device registry verification.
- **Log Data:** Access logs, application logs, and audit trail records generated during your use of the Service.
- **Session Data:** Authentication tokens, session identifiers, and timestamps required for secure session management.

### Information We Do Not Collect

- **Biometric Data:** All biometric authentication (FaceID/TouchID) occurs locally on your device via hardware security enclaves. No biometric data is transmitted to or stored on our servers.
- **Payment Card Details:** Payment processing is handled entirely by Stripe. We do not receive, store, or process your full payment card information.

## 4. How We Use Your Information

We process your personal information for the following purposes:

- **Service Delivery:** To provide, operate, and maintain the aSpiral application and APEX OmniHub platform.
- **Authentication and Security:** To verify your identity, manage sessions, and enforce zero-trust security through our Guardian and Triforce governance protocols.
- **Service Improvement:** To analyze usage patterns (in aggregate) and improve platform reliability and performance.
- **Communications:** To notify you about service changes, security incidents, scheduled maintenance, or respond to your support inquiries.
- **Fraud Prevention:** To detect, prevent, and respond to unauthorized access, security threats, and abuse through our OmniSentry monitoring system.
- **Legal Compliance:** To comply with applicable laws, regulations, and legal processes.

## 5. Lawful Bases for Processing (GDPR)

Under the GDPR, we rely on the following lawful bases:

- **Contract (Art. 6(1)(b)):** Processing necessary to provide the aSpiral and APEX OmniHub service pursuant to our Terms of Service.
- **Legitimate Interests (Art. 6(1)(f)):** Security monitoring, fraud prevention, service improvement, and maintaining the integrity of our zero-trust architecture.
- **Consent (Art. 6(1)(a)):** Where applicable, for optional marketing communications or participation in beta programs. You may withdraw consent at any time.
- **Legal Obligation (Art. 6(1)(c)):** Processing necessary to comply with applicable legal requirements.

## 6. Data Sharing and Sub-Processors

We do not sell, rent, or trade your personal information. We share data only with the following categories of trusted service providers, solely for the purpose of operating the Service:

- **Supabase** (Authentication, database, and secure storage)
- **Vercel** (Application hosting and content delivery)
- **Stripe** (Payment processing)
- **Error and performance monitoring** (when configured, e.g., Sentry)

All sub-processors are bound by data processing agreements that require them to protect your data in accordance with this Privacy Policy and applicable law.

We may also disclose information when required by law, subpoena, court order, or to protect the rights, safety, or property of APEX Business Systems Ltd. or others.

## 7. Data Retention

We retain your personal information only for as long as necessary to fulfill the purposes described in this Privacy Policy, unless a longer retention period is required by law.

- **Application Logs:** 90 days
- **Access Logs:** 180 days
- **Audit Logs (OmniTrace):** 365 days
- **Database Backups:** 30 days
- **Account Data:** Retained for the duration of your account, plus a 30-day grace period following deletion.

Upon account deletion, personal data is permanently removed in accordance with the deletion workflow described in Section 8.

## 8. Your Privacy Rights

### For All Users

- **Access:** Request a copy of the personal data we hold about you.
- **Correction:** Request correction of inaccurate or incomplete information.
- **Deletion:** Request deletion of your account and associated data.
- **Data Export:** Download your data in a portable format (JSON/ZIP archive).

### Self-Service Tools

You can exercise your Access and Deletion rights directly within the Service:

- **Data Export:** Navigate to Settings, then Account, then click "Export My Data" to receive a secure download link (valid for 1 hour) containing your profile, stored resources, and associated audit logs.
- **Account Deletion:** Navigate to Settings, then Account, then click "Delete Account". After confirmation, your account enters a 30-day grace period (soft delete), after which all personal data is permanently and irreversibly removed. An email confirmation is sent upon final deletion.

### Additional Rights (GDPR)

- **Restriction:** Request restriction of processing in certain circumstances.
- **Objection:** Object to processing based on legitimate interests, including for marketing or analytics purposes.
- **Portability:** Receive your data in a structured, commonly used, machine-readable format.
- **Complaint:** Lodge a complaint with your local data protection authority.

### Additional Rights (CCPA)

- **Right to Know:** Request disclosure of the categories and specific pieces of personal information we have collected.
- **Right to Delete:** Request deletion of personal information we have collected.
- **Right to Non-Discrimination:** We will not discriminate against you for exercising your CCPA rights.
- **No Sale of Personal Information:** We do not sell personal information as defined under the CCPA.

### How to Exercise Your Rights

Use the self-service tools within the Service, or email privacy@apexomnihub.icu. We respond to all verified requests within 30 days.

## 9. Data Security

We implement industry-standard and advanced security measures to protect your information:

- **Zero-Trust Architecture:** All access is verified through our Fortress Protocol. No implicit trust is granted to any user, device, or network.
- **Device Registry:** Hardware-level allowlisting ensures only authorized devices can access the Service.
- **Biometric Gating:** High-risk operations require biometric verification via on-device hardware enclaves (FaceID/TouchID). No biometric data leaves your device.
- **Governance Layer:** The Triforce Protocol (Guardian, Planner, Executor) ensures all automated actions are authorized, logged, and reversible.
- **Human Oversight:** MAN Mode (Manual Authorization Needed) requires explicit human approval for high-risk operations, in compliance with EU AI Act Article 14.
- **Audit Trails:** All actions are immutably logged via OmniTrace for forensic replay and GDPR Art. 30 compliance.
- **Encryption:** Data is encrypted in transit (TLS) and at rest.
- **Security Testing:** Our platform is Armageddon L7 certified, having undergone 40,000 adversarial test iterations with a 0% escape rate on goal hijack and tool misuse scenarios.

## 10. International Data Transfers

APEX Business Systems Ltd. is headquartered in Alberta, Canada. If you are accessing the Service from outside Canada, your information may be transferred to and processed in Canada. Canada has been recognized by the European Commission as providing an adequate level of data protection. Where additional safeguards are required, we use Standard Contractual Clauses or other approved transfer mechanisms.

## 11. Children's Privacy

The Service is not directed to individuals under the age of 16. We do not knowingly collect personal information from children. If we become aware that we have collected personal data from a child without parental consent, we will take steps to delete that information promptly.

## 12. Cookies and Tracking Technologies

The Service uses only essential cookies and local storage required for authentication, session management, and theme preferences. We do not use third-party advertising cookies or cross-site tracking technologies. No personal data is shared with advertising networks.

## 13. Changes to This Privacy Policy

We reserve the right to update this Privacy Policy at any time. When we make material changes, we will notify you by updating the "Effective Date" at the top of this page and, where appropriate, through in-app notification or email. Your continued use of the Service after changes become effective constitutes acceptance of the revised policy.

## 14. Governing Law

This Privacy Policy is governed by and construed in accordance with the laws of Alberta, Canada, without regard to its conflict of law provisions.

## 15. Contact Us

If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:

- **Email:** privacy@apexomnihub.icu
- **Entity:** APEX Business Systems Ltd.
- **Jurisdiction:** Alberta, Canada
`;

export default privacyPolicyContent;
