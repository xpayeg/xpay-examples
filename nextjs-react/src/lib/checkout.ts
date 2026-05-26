export async function createCheckoutSession(items: { productId: string; quantity: number }[]) {
  const response = await fetch("/api/create-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uiMode: "custom",
      items,
      allowPromotionCodes: true,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Failed to create session");
  return data as { clientSecret: string };
}
