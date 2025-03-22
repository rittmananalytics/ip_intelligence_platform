import { FaBars } from "react-icons/fa";
import { useState } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger 
} from "@/components/ui/sheet";

function Header() {
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <a href="/" className="flex items-center">
            <img 
              src="/images/ra_logo.png" 
              alt="Rittman Analytics Logo" 
              className="h-8 mr-2" 
            />
          </a>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden sm:flex items-center space-x-4">
          <a href="#" className="text-gray-600 hover:text-primary text-sm">Documentation</a>
          <a href="/API-README.md" target="_blank" className="text-gray-600 hover:text-primary text-sm">API</a>
          <a href="#" className="text-gray-600 hover:text-primary text-sm">Pricing</a>
        </div>
        
        {/* Mobile Navigation */}
        <Sheet>
          <SheetTrigger asChild>
            <button className="sm:hidden text-gray-700" aria-label="Menu">
              <FaBars className="text-xl" />
            </button>
          </SheetTrigger>
          <SheetContent>
            <div className="flex flex-col space-y-4 mt-8">
              <a href="#" className="text-gray-600 hover:text-primary text-sm">Documentation</a>
              <a href="/API-README.md" target="_blank" className="text-gray-600 hover:text-primary text-sm">API</a>
              <a href="#" className="text-gray-600 hover:text-primary text-sm">Pricing</a>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

export default Header;
