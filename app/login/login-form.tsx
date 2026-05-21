"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !data.user) {
      setError("אימייל או סיסמה שגויים");
      setLoading(false);
      return;
    }

    const role = data.user.user_metadata?.role as string | undefined;
    router.push(role === "admin" ? "/admin/dashboard" : "/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Theme toggle — top left (end in RTL) */}
      <div className="absolute top-4 end-4">
        <ThemeToggle />
      </div>

      {/* Centered content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <img src="/logo.svg" alt="תבור" className="w-24 h-24 mb-4" />
          <h1 className="text-2xl font-bold tracking-tight">תבור</h1>
          <p className="text-sm text-muted-foreground mt-1">אולפן ערבית לכוחות הביטחון</p>
        </div>

        {/* Form */}
        <div className="w-full max-w-sm space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">אימייל</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
                dir="ltr"
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">סיסמה</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                dir="ltr"
                className="h-11"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
              {loading ? "מתחבר..." : "כניסה"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
