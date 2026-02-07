import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Settings as SettingsIcon, User, Bell, Shield, LogOut, Fingerprint, Smartphone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useCapabilities } from '@/hooks/useCapabilities';
import { toast } from 'sonner';
import {
  isPlatformAuthenticatorAvailable,
  getBiometricAuthenticatorInfo,
  setupBiometricLogin
} from '@/lib/biometric-auth';
import {
  getPushSubscriptionStatus,
  enablePushNotifications,
  unsubscribeFromPushNotifications
} from '@/lib/push-notifications';
import {
  hasOptedOutOfAnalytics,
  optInToAnalytics,
  optOutOfAnalytics
} from '@/lib/pwa-analytics';

/**
 * Settings Page - User preferences and account management
 */
export default function Settings() {
  const { user, signOut } = useAuth();
  const { capabilities } = useCapabilities();
  const navigate = useNavigate();

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricInfo, setBiometricInfo] = useState<Awaited<ReturnType<typeof getBiometricAuthenticatorInfo>> | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const [pushAvailable, setPushAvailable] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  const [analyticsOptedOut, setAnalyticsOptedOut] = useState(false);

  useEffect(() => {
    // Check biometric availability
    isPlatformAuthenticatorAvailable().then((available) => {
      setBiometricAvailable(available);
      if (available) {
        getBiometricAuthenticatorInfo().then(setBiometricInfo);
      }
    });

    // Check push notification status
    getPushSubscriptionStatus().then((status) => {
      setPushAvailable(status.supported);
      setPushEnabled(status.subscribed);
    });

    // Check analytics opt-out status
    setAnalyticsOptedOut(hasOptedOutOfAnalytics());
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleEnableBiometric = async () => {
    if (!user) return;

    try {
      const apiUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const success = await setupBiometricLogin(user.id, user.email || '', apiUrl);

      if (success) {
        setBiometricEnabled(true);
        toast.success('Biometric authentication enabled');
      } else {
        toast.error('Failed to enable biometric authentication');
      }
    } catch {
      toast.error('Biometric setup failed');
    }
  };

  const handleEnablePush = async () => {
    try {
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        toast.error('Push notifications not configured');
        return;
      }

      const success = await enablePushNotifications(vapidKey);
      if (success) {
        setPushEnabled(true);
        toast.success('Push notifications enabled');
      } else {
        toast.error('Failed to enable push notifications');
      }
    } catch {
      toast.error('Push notification setup failed');
    }
  };

  const handleDisablePush = async () => {
    try {
      const success = await unsubscribeFromPushNotifications();
      if (success) {
        setPushEnabled(false);
        toast.success('Push notifications disabled');
      }
    } catch {
      toast.error('Failed to disable push notifications');
    }
  };

  const handleEnableAnalytics = () => {
    optInToAnalytics();
    setAnalyticsOptedOut(false);
    toast.success('Analytics enabled');
  };

  const handleDisableAnalytics = () => {
    optOutOfAnalytics();
    setAnalyticsOptedOut(true);
    toast.success('Analytics disabled');
  };

  const analyticsHandlers = {
    enable: handleEnableAnalytics,
    disable: handleDisableAnalytics,
  } as const;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">Settings</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Account */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Account
                </CardTitle>
                <CardDescription>Your account information</CardDescription>
              </div>
              {capabilities.isAdmin && (
                <Badge variant="default">Admin</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">User ID</p>
              <p className="font-mono text-xs">{user?.id}</p>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize how OmniLink looks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Theme</p>
                <p className="text-sm text-muted-foreground">
                  Choose your preferred color scheme
                </p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        {/* Biometric Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5" />
              Biometric Authentication
            </CardTitle>
            <CardDescription>Sign in with Face ID or Touch ID</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {biometricAvailable ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {(() => {
                        if (biometricInfo?.type === 'face') return 'Face ID';
                        if (biometricInfo?.type === 'fingerprint') return 'Touch ID';
                        return 'Biometric';
                      })()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Platform: {biometricInfo?.platform}
                    </p>
                  </div>
                  {biometricEnabled ? (
                    <Badge variant="default">Enabled</Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEnableBiometric}
                    >
                      Enable
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Use biometric authentication for faster and more secure sign-in
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Biometric authentication not available on this device
              </p>
            )}
          </CardContent>
        </Card>

        {/* Push Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Push Notifications
            </CardTitle>
            <CardDescription>Receive notifications for important events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pushAvailable ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Desktop & Mobile Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified about workflows, integrations, and alerts
                  </p>
                </div>
                <Switch
                  checked={pushEnabled}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleEnablePush();
                    } else {
                      handleDisablePush();
                    }
                  }}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Push notifications not supported in this browser
              </p>
            )}
          </CardContent>
        </Card>

        {/* Privacy & Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Privacy & Analytics
            </CardTitle>
            <CardDescription>Control what data is collected</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Anonymous Analytics</p>
                <p className="text-sm text-muted-foreground">
                  Help improve OmniLink by sharing anonymous usage data
                </p>
              </div>
              <Switch
                checked={!analyticsOptedOut}
                onCheckedChange={(checked) => 
                  checked ? analyticsHandlers.enable() : analyticsHandlers.disable()
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              We never collect personally identifiable information. All analytics
              data is anonymous and used solely to improve the app.
            </p>
          </CardContent>
        </Card>

        {/* PWA Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              PWA Status
            </CardTitle>
            <CardDescription>Progressive Web App information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Installed as App</span>
              <Badge variant={
                globalThis.matchMedia('(display-mode: standalone)').matches
                  ? 'default'
                  : 'secondary'
              }>
                {globalThis.matchMedia('(display-mode: standalone)').matches
                  ? 'Yes'
                  : 'No'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Offline Support</span>
              <Badge variant="default">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Service Worker</span>
              <Badge variant={
                'serviceWorker' in navigator ? 'default' : 'secondary'
              }>
                {'serviceWorker' in navigator ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card>
          <CardContent className="pt-6">
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
