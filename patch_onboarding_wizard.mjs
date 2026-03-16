import fs from 'fs';

let content = fs.readFileSync('apps/omnihub-site/src/pages/Launch/OnboardingWizard.tsx', 'utf-8');

// Fix useEffect missing dependencies
// 1. We need to make handleFinalActivation wrapped in useCallback, or just move the checkAuth inside and disable linting on that line, or provide deps.
// Given React, best is to move handleFinalActivation up, wrap in useCallback.

content = content.replace(
  "  // Handle OAuth Return or step sync\n  useEffect(() => {\n    const checkAuth = async () => {\n      const { data: { session } } = await supabase.auth.getSession();",
  `  const handleFinalActivation = async (tier: 'BASIC' | 'PRO') => {
    if (isActivating) return;
    setIsActivating(true);

    try {
      if (tier === 'BASIC') {
        const { error } = await supabase.functions.invoke('activate-client', {
          body: { tier: 'BASIC', skills: sessionData.skills.filter(s => s.tier === 'CORE') }
        });

        if (error) throw error;

        sessionStorage.removeItem('omnihub_onboarding');
        navigate('/omnidash?onboarded=true');

      } else if (tier === 'PRO') {
        const returnUrl = new URL(window.location.origin);

        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: {
            tier: 'PRO',
            skills: sessionData.skills,
            returnUrl: returnUrl.toString()
          }
        });

        if (error) throw error;

        if (data?.url) {
          window.location.href = data.url; // Redirect to Stripe
        } else {
          throw new Error('No checkout URL returned');
        }
      }
    } catch (error: unknown) {
      console.error("Activation failed:", error);
      toast.error(error instanceof Error ? error.message : "Activation failed. Please try again.");
      setIsActivating(false);
    }
  };

  // Handle OAuth Return or step sync
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();`
);

// We need to add dependencies to useEffect
content = content.replace(
  "    checkAuth();\n  }, [step, sessionData.selectedTier]);",
  "    checkAuth();\n  }, [step, sessionData.selectedTier, sessionData.skills, isActivating, navigate]);"
);

// We need to remove the old handleFinalActivation that was lower down
content = content.replace(
  /  const handleFinalActivation = async \(tier: 'BASIC' \| 'PRO'\) => \{\n    if \(isActivating\) return;[\s\S]*?setIsActivating\(false\);\n    \}\n  \};\n/,
  ""
);

// Fix other `any` catches
content = content.replace(/catch \(err: any\)/g, "catch (err: unknown)");
content = content.replace(/toast\.error\(err\.message \|\| 'Authentication failed'\);/g, "toast.error(err instanceof Error ? err.message : 'Authentication failed');");

fs.writeFileSync('apps/omnihub-site/src/pages/Launch/OnboardingWizard.tsx', content);

// Fix Edge Functions
let activateClient = fs.readFileSync('supabase/functions/activate-client/index.ts', 'utf-8');
activateClient = activateClient.replace(/skills: any\[\];/g, "skills: Record<string, unknown>[];");
fs.writeFileSync('supabase/functions/activate-client/index.ts', activateClient);

let createCheckout = fs.readFileSync('supabase/functions/create-checkout/index.ts', 'utf-8');
createCheckout = createCheckout.replace(/skills: any\[\];/g, "skills: Record<string, unknown>[];");
fs.writeFileSync('supabase/functions/create-checkout/index.ts', createCheckout);

console.log("Patched");
