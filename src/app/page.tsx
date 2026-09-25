import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { homePath } from "@/lib/preferences";

export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? homePath(user.homePage) : "/login");
}
