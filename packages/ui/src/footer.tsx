import Link from "next/link";
import { X, Linkedin, Github } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-6 px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
        <p className="text-sm mb-4 md:mb-0">
          &copy; 2024 Ko-lab. All rights reserved.
        </p>
        <div className="flex space-x-4">
          <Link
            href="/privacy"
            className="text-sm hover:text-blue-400 transition-colors duration-300"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="text-sm hover:text-blue-400 transition-colors duration-300"
          >
            Terms of Service
          </Link>
          <Link
            href="/contact"
            className="text-sm hover:text-blue-400 transition-colors duration-300"
          >
            Contact Us
          </Link>
          <Link
            href="https://github.com/VanshikaSabharwal/co-lab"
            target="_blank"
            className="text-sm hover:text-blue-400 transition-colors duration-300"
          >
            <Github />
          </Link>
          <Link
            href="https://www.linkedin.com/in/vanshika-sabharwal-867237284/"
            target="_blank"
            className="text-sm hover:text-blue-400 transition-colors duration-300"
          >
            <Linkedin />
          </Link>
          <Link
            href="https://x.com/Vanshika_0006"
            target="_blank"
            className="text-sm hover:text-blue-400 transition-colors duration-300"
          >
            <X />
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
