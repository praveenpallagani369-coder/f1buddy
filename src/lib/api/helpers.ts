import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { user: null, supabase, error: "UNAUTHORIZED" };
  return { user, supabase, error: null };
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function err(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export const UNAUTHORIZED = () => err("UNAUTHORIZED", "Sign in required", 401);
export const NOT_FOUND = () => err("NOT_FOUND", "Resource not found", 404);
export const FORBIDDEN = () => err("FORBIDDEN", "Access denied", 403);
