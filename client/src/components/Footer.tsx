function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-12">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} IP Enrichment Service. All rights reserved.</p>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-gray-500 hover:text-primary text-sm">Privacy Policy</a>
            <a href="#" className="text-gray-500 hover:text-primary text-sm">Terms of Service</a>
            <a href="#" className="text-gray-500 hover:text-primary text-sm">Contact Us</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
