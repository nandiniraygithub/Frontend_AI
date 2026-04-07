
export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-[#f1f1f1] ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center gap-3">
            <img 
              src="/AiCal.png" 
              alt="AiCal Logo" 
              className="w-8 h-8 rounded-lg"
            />
            <span className="text-xl font-bold text-gray-900">AiCal</span>
          </div>
          
          {/* Navigation Links */}
         
          
          {/* CTA Button */}
          
        </div>
      </div>
    </nav>
  );
}
