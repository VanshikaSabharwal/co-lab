import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";

const session = await getServerSession(authOptions);
const phone = session?.user?.id;
export const UserPhoneNumber = phone;
