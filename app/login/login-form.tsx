"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Orange gradient header — top 40% */}
      <div className="h-[40vh] bg-gradient-to-b from-primary to-[oklch(60%_0.22_40)] flex flex-col items-center justify-center gap-2 px-6">
        <h1 className="text-4xl font-black text-white tracking-tight">תבור</h1>
        <p className="text-lg text-white/80">בית הספר לערבית</p>
      </div>

      {/* Floating form card */}
      <div className="flex-1 flex flex-col items-center px-6 -mt-8">
        <div className="w-full max-w-sm bg-card rounded-2xl shadow-[0_8px_32px_oklch(0%_0_0/0.12)] p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                אימייל
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
                dir="ltr"
                className="h-12 rounded-xl border-2 focus:border-primary focus-visible:ring-0"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">
                סיסמה
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                dir="ltr"
                className="h-12 rounded-xl border-2 focus:border-primary focus-visible:ring-0"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              className="w-full h-12 rounded-xl font-bold text-base"
              disabled={loading}
            >
              {loading ? "מתחבר..." : "כניסה"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
