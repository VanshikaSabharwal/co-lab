import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";

const session = await getServerSession(authOptions);
const user = session?.user;
const phone = session?.user?.id;
export const UserPhoneNumber = phone;
