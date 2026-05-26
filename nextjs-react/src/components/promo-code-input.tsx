"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tag } from "lucide-react";

interface PromoCodeInputProps {
  onApply: (code: string) => Promise<{ type: string; error?: { message: string } }>;
  onRemove: () => Promise<{ type: string; error?: { message: string } }>;
  hasActivePromo: boolean;
  activePromoCode?: string;
}

export function PromoCodeInput({
  onApply,
  onRemove,
  hasActivePromo,
  activePromoCode,
}: PromoCodeInputProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setError("");
    setLoading(true);
    const result = await onApply(trimmed);
    setLoading(false);

    if (result.type === "error") {
      setError(result.error?.message ?? "Failed to apply code");
    }
  };

  const handleRemove = async () => {
    setError("");
    setLoading(true);
    const result = await onRemove();
    setLoading(false);
    setCode("");

    if (result.type === "error") {
      setError(result.error?.message ?? "Failed to remove code");
    }
  };

  return (
    <div>
      <label className="mb-2 flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Tag className="mr-1.5 h-3 w-3" /> Promotion Code
      </label>

      <div className="flex gap-2">
        <Input
          value={hasActivePromo ? activePromoCode ?? code : code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !hasActivePromo && handleApply()}
          placeholder="Enter code"
          disabled={hasActivePromo || loading}
          className="h-9 flex-1 rounded-md text-sm"
        />

        {hasActivePromo ? (
          <Button
            variant="destructive"
            onClick={handleRemove}
            disabled={loading}
            className="h-9 rounded-md px-4 text-sm"
          >
            {loading ? "..." : "Remove"}
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={handleApply}
            disabled={!code.trim() || loading}
            className="h-9 rounded-md px-4 text-sm"
          >
            {loading ? "..." : "Apply"}
          </Button>
        )}
      </div>

      {error && <p className="mt-2 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
