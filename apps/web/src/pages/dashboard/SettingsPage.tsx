import { Card, CardBody, CardHeader, Switch, Divider, Button } from '@heroui/react';
import { User, Bell, Palette, Shield, CreditCard } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';

export function SettingsPage() {
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-foreground/60 mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Section */}
      <Card className="bg-content1/50">
        <CardHeader className="flex gap-3">
          <User size={20} className="text-primary" />
          <div className="flex flex-col">
            <p className="text-md font-semibold">Profile</p>
            <p className="text-small text-foreground/60">Your account information</p>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Name</p>
              <p className="text-sm text-foreground/60">{user?.name ?? '-'}</p>
            </div>
            <Button size="sm" variant="flat">Edit</Button>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Email</p>
              <p className="text-sm text-foreground/60">{user?.email ?? '-'}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Appearance Section */}
      <Card className="bg-content1/50">
        <CardHeader className="flex gap-3">
          <Palette size={20} className="text-primary" />
          <div className="flex flex-col">
            <p className="text-md font-semibold">Appearance</p>
            <p className="text-small text-foreground/60">Customize how the app looks</p>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Dark Mode</p>
              <p className="text-sm text-foreground/60">Use dark theme</p>
            </div>
            <Switch 
              isSelected={theme === 'dark'}
              onValueChange={toggleTheme}
            />
          </div>
        </CardBody>
      </Card>

      {/* Notifications Section */}
      <Card className="bg-content1/50">
        <CardHeader className="flex gap-3">
          <Bell size={20} className="text-primary" />
          <div className="flex flex-col">
            <p className="text-md font-semibold">Notifications</p>
            <p className="text-small text-foreground/60">Manage notification preferences</p>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-foreground/60">Receive updates via email</p>
            </div>
            <Switch defaultSelected />
          </div>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Export Completed</p>
              <p className="text-sm text-foreground/60">Notify when export is ready</p>
            </div>
            <Switch defaultSelected />
          </div>
        </CardBody>
      </Card>

      {/* Subscription Section */}
      <Card className="bg-content1/50">
        <CardHeader className="flex gap-3">
          <CreditCard size={20} className="text-primary" />
          <div className="flex flex-col">
            <p className="text-md font-semibold">Subscription</p>
            <p className="text-small text-foreground/60">Manage your plan</p>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Current Plan</p>
              <p className="text-sm text-foreground/60">Free Tier</p>
            </div>
            <Button size="sm" color="primary">Upgrade</Button>
          </div>
        </CardBody>
      </Card>

      {/* Security Section */}
      <Card className="bg-content1/50">
        <CardHeader className="flex gap-3">
          <Shield size={20} className="text-primary" />
          <div className="flex flex-col">
            <p className="text-md font-semibold">Security</p>
            <p className="text-small text-foreground/60">Manage your security settings</p>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Change Password</p>
              <p className="text-sm text-foreground/60">Update your password</p>
            </div>
            <Button size="sm" variant="flat">Change</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
