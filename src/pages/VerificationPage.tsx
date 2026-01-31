/**
 * APEX Resilience Verification Page
 * Entry point for the minimalist verification interface
 */

import { VerificationQueue } from '@/components/VerificationQueue';
import '@/styles/verification-queue.css';

export default function VerificationPage() {
  return <VerificationQueue />;
}
