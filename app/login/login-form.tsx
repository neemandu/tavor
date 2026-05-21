"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

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
    <div className="min-h-screen flex flex-col bg-muted/20">
      {/* Branded hero section */}
      <div className="bg-gradient-to-b from-primary to-primary/80 text-primary-foreground flex flex-col items-center justify-center pt-12 pb-14 px-4" style={{ minHeight: "38%" }}>
        <img src="/logo.svg" alt="תבור" className="w-32 h-32 mb-1 drop-shadow-lg" />
        <p className="text-sm mt-1 opacity-75 tracking-wide">כוחות הביטחון</p>
      </div>

      {/* Form card floating over the hero */}
      <div className="-mt-6 mx-4 relative z-10 max-w-sm w-full self-center">
        <Card className="w-full shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">כניסה למערכת</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">אימייל</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">סיסמה</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  dir="ltr"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "מתחבר..." : "כניסה"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
