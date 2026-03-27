"use client";

// This just redirects to home which shows rounds
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RoundsPage() {
  const router = useRouter();
  useEffect(() => { router.push("/"); }, [router]);
  return null;
}
