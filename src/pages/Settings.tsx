import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Bell, Shield, Database, Palette, Building2, Globe, DollarSign, Save, Loader2, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi, type Setting, type SettingsGrouped } from "@/lib/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const Settings = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [localSettings, setLocalSettings] = useState<Record<string, string | number | boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: settings, isLoading, error } = useQuery<SettingsGrouped>({
    queryKey: ["settings"],
    queryFn: () => settingsApi.getAll(),
  });

  // Initialize local settings when data loads
  useEffect(() => {
    if (settings) {
      const flat: Record<string, string | number | boolean> = {};
      Object.values(settings).flat().forEach((setting) => {
        flat[setting.key] = setting.value as string | number | boolean;
      });
      setLocalSettings(flat);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (settingsToSave: Omit<Setting, "id" | "createdAt" | "updatedAt">[]) =>
      settingsApi.bulkUpdate(settingsToSave),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings saved successfully");
      setHasChanges(false);
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });

  const handleChange = (key: string, value: string | number | boolean) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!settings) return;

    const settingsToSave: Omit<Setting, "id" | "createdAt" | "updatedAt">[] = [];
    
    Object.values(settings).flat().forEach((setting) => {
      const newValue = localSettings[setting.key];
      if (newValue !== undefined && newValue !== setting.value) {
        settingsToSave.push({
          key: setting.key,
          value: newValue,
          category: setting.category,
          type: setting.type,
          label: setting.label,
          description: setting.description,
          isPublic: setting.isPublic,
        });
      }
    });

    if (settingsToSave.length > 0) {
      saveMutation.mutate(settingsToSave);
    }
  };

  const getSetting = (key: string): string | number | boolean => {
    return localSettings[key] ?? "";
  };

  const getSettingBool = (key: string): boolean => {
    const val = localSettings[key];
    return val === true || val === "true";
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-red-500">Failed to load settings</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["settings"] })}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">Manage your account and system preferences</p>
          </div>
          {hasChanges && (
            <Button 
              onClick={handleSave} 
              disabled={saveMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          )}
        </div>

        {/* Company Branding - NEW TOP SECTION */}
        <div className="glass-card p-6 border-2 border-primary/20">
          <div className="flex items-center gap-3 mb-6">
            <Building2 className="w-6 h-6 text-primary" />
            <div>
              <h3 className="section-title">Company Branding</h3>
              <p className="text-sm text-muted-foreground">Configure your company identity across the entire application</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="companyName" className="flex items-center gap-2">
                Company Name <span className="text-xs text-primary">(Shows everywhere)</span>
              </Label>
              <Input 
                id="companyName" 
                value={getSetting("company.name") as string} 
                onChange={(e) => handleChange("company.name", e.target.value)}
                placeholder="Your Company Name"
                className="bg-secondary font-medium" 
              />
              <p className="text-xs text-muted-foreground">Appears in sidebar, reports, and exports</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyTagline">Tagline / Slogan</Label>
              <Input 
                id="companyTagline" 
                value={getSetting("company.tagline") as string} 
                onChange={(e) => handleChange("company.tagline", e.target.value)}
                placeholder="Business Dashboard"
                className="bg-secondary" 
              />
              <p className="text-xs text-muted-foreground">Displays below company name</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyEmail">Company Email</Label>
              <Input 
                id="companyEmail" 
                type="email"
                value={getSetting("company.email") as string} 
                onChange={(e) => handleChange("company.email", e.target.value)}
                placeholder="info@company.com"
                className="bg-secondary" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyPhone">Company Phone</Label>
              <Input 
                id="companyPhone" 
                value={getSetting("company.phone") as string} 
                onChange={(e) => handleChange("company.phone", e.target.value)}
                placeholder="+255..."
                className="bg-secondary" 
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="companyAddress">Company Address</Label>
              <Input 
                id="companyAddress" 
                value={getSetting("company.address") as string} 
                onChange={(e) => handleChange("company.address", e.target.value)}
                placeholder="Full business address"
                className="bg-secondary" 
              />
              <p className="text-xs text-muted-foreground">Used in reports and official documents</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyWebsite">Website</Label>
              <Input 
                id="companyWebsite" 
                type="url"
                value={getSetting("company.website") as string} 
                onChange={(e) => handleChange("company.website", e.target.value)}
                placeholder="https://www.company.com"
                className="bg-secondary" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyTaxId">Tax ID / TIN</Label>
              <Input 
                id="companyTaxId" 
                value={getSetting("company.taxId") as string} 
                onChange={(e) => handleChange("company.taxId", e.target.value)}
                placeholder="Tax identification number"
                className="bg-secondary" 
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="companyLogo" className="flex items-center gap-2">
                Company Logo 
                <span className="text-xs text-muted-foreground">(Shows in sidebar & reports)</span>
              </Label>
              <div className="flex items-center gap-4">
                {getSetting("company.logo") && (
                  <div className="w-16 h-16 rounded-lg border-2 border-border overflow-hidden bg-secondary flex items-center justify-center">
                    <img 
                      src={getSetting("company.logo") as string} 
                      alt="Company Logo" 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="flex-1">
                  <Input 
                    id="companyLogo" 
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Convert to base64
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          handleChange("company.logo", reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="bg-secondary cursor-pointer" 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload your company logo (PNG, JPG, SVG recommended). Leave empty to use company initials.
                  </p>
                </div>
                {getSetting("company.logo") && (
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={() => handleChange("company.logo", "")}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Settings */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-5 h-5 text-primary" />
            <h3 className="section-title">Profile Settings</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                value={user?.fullName || ""} 
                className="bg-secondary" 
                disabled 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                value={user?.email || ""} 
                className="bg-secondary" 
                disabled 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                value={user?.username || ""} 
                className="bg-secondary" 
                disabled 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input 
                id="role" 
                value={user?.isAdmin ? "Administrator" : "User"} 
                className="bg-secondary" 
                disabled 
              />
            </div>
          </div>
        </div>

        {/* General Settings */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Building2 className="w-5 h-5 text-primary" />
            <h3 className="section-title">General</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="appName">Application Name</Label>
              <Input 
                id="appName" 
                value={getSetting("app.name") as string} 
                onChange={(e) => handleChange("app.name", e.target.value)}
                className="bg-secondary" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input 
                id="tagline" 
                value={getSetting("app.tagline") as string} 
                onChange={(e) => handleChange("app.tagline", e.target.value)}
                className="bg-secondary" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select 
                value={getSetting("app.timezone") as string}
                onValueChange={(v) => handleChange("app.timezone", v)}
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Africa/Dar_es_Salaam">Africa/Dar es Salaam (EAT)</SelectItem>
                  <SelectItem value="Africa/Nairobi">Africa/Nairobi (EAT)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">America/New York (EST)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date Format</Label>
              <Select 
                value={getSetting("app.dateFormat") as string}
                onValueChange={(v) => handleChange("app.dateFormat", v)}
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Currency Settings */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <DollarSign className="w-5 h-5 text-primary" />
            <h3 className="section-title">Currency</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="currencyCode">Currency Code</Label>
              <Select 
                value={getSetting("currency.code") as string}
                onValueChange={(v) => handleChange("currency.code", v)}
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TZS">TZS - Tanzanian Shilling</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="TSH">TSH - Tanzanian Shilling</SelectItem>
                  <SelectItem value="UGX">UGX - Ugandan Shilling</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currencySymbol">Currency Symbol</Label>
              <Input 
                id="currencySymbol" 
                value={getSetting("currency.symbol") as string} 
                onChange={(e) => handleChange("currency.symbol", e.target.value)}
                className="bg-secondary" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbolPosition">Symbol Position</Label>
              <Select 
                value={getSetting("currency.position") as string}
                onValueChange={(v) => handleChange("currency.position", v)}
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="before">Before amount (TSh 1,000)</SelectItem>
                  <SelectItem value="after">After amount (1,000 TSh)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="decimalPlaces">Decimal Places</Label>
              <Select 
                value={String(getSetting("currency.decimalPlaces"))}
                onValueChange={(v) => handleChange("currency.decimalPlaces", v)}
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Select decimal places" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 (1,000)</SelectItem>
                  <SelectItem value="2">2 (1,000.00)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="section-title">Notifications</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive notifications via email</p>
              </div>
              <Switch 
                checked={getSettingBool("notifications.email")}
                onCheckedChange={(v) => handleChange("notifications.email", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Get browser push notifications</p>
              </div>
              <Switch 
                checked={getSettingBool("notifications.push")}
                onCheckedChange={(v) => handleChange("notifications.push", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Debt Reminders</p>
                <p className="text-sm text-muted-foreground">Receive alerts for upcoming debt due dates</p>
              </div>
              <Switch 
                checked={getSettingBool("notifications.debtReminders")}
                onCheckedChange={(v) => handleChange("notifications.debtReminders", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Goal Alerts</p>
                <p className="text-sm text-muted-foreground">Alert when goals are at risk or achieved</p>
              </div>
              <Switch 
                checked={getSettingBool("notifications.goalAlerts")}
                onCheckedChange={(v) => handleChange("notifications.goalAlerts", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Weekly Reports</p>
                <p className="text-sm text-muted-foreground">Automated weekly performance summary</p>
              </div>
              <Switch 
                checked={getSettingBool("notifications.weeklyReport")}
                onCheckedChange={(v) => handleChange("notifications.weeklyReport", v)}
              />
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="w-5 h-5 text-primary" />
            <h3 className="section-title">Appearance</h3>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select 
                  value={getSetting("appearance.theme") as string}
                  onValueChange={(v) => handleChange("appearance.theme", v)}
                >
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    id="primaryColor" 
                    type="color"
                    value={getSetting("appearance.primaryColor") as string} 
                    onChange={(e) => handleChange("appearance.primaryColor", e.target.value)}
                    className="w-12 h-10 p-1 bg-secondary cursor-pointer" 
                  />
                  <Input 
                    value={getSetting("appearance.primaryColor") as string} 
                    onChange={(e) => handleChange("appearance.primaryColor", e.target.value)}
                    className="flex-1 bg-secondary" 
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Compact Mode</p>
                <p className="text-sm text-muted-foreground">Use smaller spacing in the UI</p>
              </div>
              <Switch 
                checked={getSettingBool("appearance.compactMode")}
                onCheckedChange={(v) => handleChange("appearance.compactMode", v)}
              />
            </div>
          </div>
        </div>

        {/* Reports */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-5 h-5 text-primary" />
            <h3 className="section-title">Reports & Business</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="defaultPeriod">Default Report Period</Label>
              <Select 
                value={getSetting("reports.defaultPeriod") as string}
                onValueChange={(v) => handleChange("reports.defaultPeriod", v)}
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="quarter">Quarter</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fiscalYearStart">Fiscal Year Start</Label>
              <Select 
                value={getSetting("business.fiscalYearStart") as string}
                onValueChange={(v) => handleChange("business.fiscalYearStart", v)}
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Select start month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="01-01">January</SelectItem>
                  <SelectItem value="04-01">April</SelectItem>
                  <SelectItem value="07-01">July</SelectItem>
                  <SelectItem value="10-01">October</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name (for reports)</Label>
              <Input 
                id="companyName" 
                value={getSetting("reports.companyName") as string} 
                onChange={(e) => handleChange("reports.companyName", e.target.value)}
                className="bg-secondary" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyAddress">Company Address</Label>
              <Input 
                id="companyAddress" 
                value={getSetting("reports.companyAddress") as string} 
                onChange={(e) => handleChange("reports.companyAddress", e.target.value)}
                className="bg-secondary" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="overdueDays">Days Until Debt is Overdue</Label>
              <Input 
                id="overdueDays" 
                type="number"
                value={getSetting("business.debtOverdueDays") as string} 
                onChange={(e) => handleChange("business.debtOverdueDays", e.target.value)}
                className="bg-secondary" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workingDays">Working Days Per Week</Label>
              <Select 
                value={String(getSetting("business.workingDaysPerWeek"))}
                onValueChange={(v) => handleChange("business.workingDaysPerWeek", v)}
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Select days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 days</SelectItem>
                  <SelectItem value="6">6 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Include Logo in Reports</p>
              <p className="text-sm text-muted-foreground">Show company logo in PDF reports</p>
            </div>
            <Switch 
              checked={getSettingBool("reports.includeLogo")}
              onCheckedChange={(v) => handleChange("reports.includeLogo", v)}
            />
          </div>
        </div>

        {/* Security */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="section-title">Security</h3>
          </div>
          <div className="space-y-4">
            <Button variant="outline">Change Password</Button>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
              </div>
              <Switch disabled />
            </div>
            <p className="text-xs text-muted-foreground">Two-factor authentication will be available in a future update.</p>
          </div>
        </div>

        {hasChanges && (
          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={saveMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Settings;
