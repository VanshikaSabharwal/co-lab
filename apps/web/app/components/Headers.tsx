"use client";
import { Appbar } from "@repo/ui/header";
import { signOut, signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const Header = () => {
  const session = useSession();
  const router = useRouter();
  return (
    <div>
      <Appbar
        onSignin={signIn}
        onSignout={async () => {
          await signOut();
          router.push("/signin");
        }}
        user={session?.data?.user ? session.data.user : null}
      />
    </div>
  );
};
export default Header;
