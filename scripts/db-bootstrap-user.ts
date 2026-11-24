import { config } from "dotenv";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const email = process.env.BOOTSTRAP_USER_EMAIL;
  const password = process.env.BOOTSTRAP_USER_PASSWORD;

  if (!url || !secretKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local");
  }
  if (!email || !password) {
    throw new Error("Faltan BOOTSTRAP_USER_EMAIL o BOOTSTRAP_USER_PASSWORD en .env.local");
  }

  const admin = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: listData, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });
  if (listError) {
    throw listError;
  }

  const existing = listData.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  let userId: string;

  if (existing) {
    userId = existing.id;
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (updateError) {
      throw updateError;
    }
    console.log(`OK: Usuario personal existente verificado y sincronizado (${userId}).`);
  } else {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "owner", workspace: "academia-atomica-ge" },
    });
    if (createError || !created.user) {
      throw createError ?? new Error("No se pudo crear el usuario personal.");
    }
    userId = created.user.id;
    console.log(`OK: Usuario personal creado con auth.uid() real (${userId}).`);
  }

  // Inicializar preferencias por defecto (Dark Lab)
  const { error: prefError } = await admin
    .from("user_workspace_preferences")
    .upsert(
      {
        user_id: userId,
        theme: "dark-lab",
        zen_mode_default: false,
      },
      { onConflict: "user_id" }
    );

  if (prefError) {
    throw prefError;
  }

  console.log("OK: Preferencias ergonómicas iniciales registradas (dark-lab).");
}

main().catch((err) => {
  console.error("Error en bootstrap de usuario:", err);
  process.exit(1);
});
