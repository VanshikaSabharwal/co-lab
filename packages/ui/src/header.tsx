import { Button } from "./button";
import { User } from "next-auth";

interface AppbarProps {
  user: User | null;
  onSignin: () => void;
  onSignout: () => void;
}

export const Appbar = ({ user, onSignin, onSignout }: AppbarProps) => {
  return (
    <div className="flex justify-between items-center px-8 py-4 bg-gradient-to-r from-black via-blue-900 to-black shadow-lg">
      <a
        className="text-8xl font-extrabold text-black tracking-wider hover:text-gray-800 transition-colors duration-300 bg-white p-2 rounded-md"
        href="/"
      >
        Co-lab
      </a>
      <div>
        <Button
          onClick={user ? onSignout : onSignin}
          classname="bg-blue-500 my-4 text-white font-semibold px-6 py-2 rounded-full shadow-md hover:bg-blue-600 transition duration-300"
        >
          {user ? "Logout" : "Login"}
        </Button>
      </div>
    </div>
  );
};
