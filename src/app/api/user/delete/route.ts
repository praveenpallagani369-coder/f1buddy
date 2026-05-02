import { getAuthUser, ok, err, UNAUTHORIZED } from "@/lib/api/helpers";
import { createServiceClient } from "@/lib/supabase/service";

export async function DELETE() {
  const { user, error } = await getAuthUser();
  if (error || !user) return UNAUTHORIZED();

  const admin = createServiceClient();

  // Delete all storage files for this user
  const { data: files } = await admin.storage.from("documents").list(user.id);
  if (files && files.length > 0) {
    const paths = files.map((f) => `${user.id}/${f.name}`);
    await admin.storage.from("documents").remove(paths);
  }

  // Delete the auth user — ON DELETE CASCADE handles all DB rows
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) return err("DELETE_FAILED", "Failed to delete account. Please contact support.", 500);

  return ok({ deleted: true });
}
