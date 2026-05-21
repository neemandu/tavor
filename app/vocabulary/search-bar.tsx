"use client";
import { useRouter, usePathname } from "next/navigation";
import { useTransition, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";

export function VocabularySearchBar({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(defaultValue ?? "");

  useEffect(() => {
    setValue(defaultValue ?? "");
  }, [defaultValue]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setValue(q);
    startTransition(() => {
      const params = new URLSearchParams(window.location.search);
      if (q) params.set("q", q);
      else params.delete("q");
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="relative">
      {isPending ? (
        <Loader2 className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin pointer-events-none" />
      ) : (
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      )}
      <Input
        value={value}
        onChange={handleChange}
        placeholder="חיפוש בעברית או ערבית..."
        className="ps-9"
      />
    </div>
  );
}
