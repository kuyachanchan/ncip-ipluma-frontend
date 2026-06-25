import { FileSignature, ShieldCheck, Users } from 'lucide-react';
import Navbar from '../components/Navbar';

const Pluma = () => {
  return (
    <div className="min-h-screen text-gray-800" style={{ backgroundColor: '#E7F2EF' }}>
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 opacity-70"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}background.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />

      {/* Navbar */}
      <Navbar currentPage="Home" />

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <div className="text-center space-y-8">
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            <span style={{ color: '#19183B' }}>
              Signing
            </span>
            <br />
            <span style={{ color: '#708993' }}>Platform</span>
          </h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto" style={{ color: '#708993' }}>
            Upload documents, apply digital signatures, verify signed files, and securely share and manage your documents
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <a 
              href={`${import.meta.env.BASE_URL}login`}
              className="px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
              style={{ backgroundColor: '#19183B', color: '#E7F2EF' }}
            >
              Get Started
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
        <div className="grid md:grid-cols-3 gap-8">
          <div 
            className="backdrop-blur-md border rounded-xl p-8 transition-all duration-300 hover:shadow-xl"
            style={{ 
              backgroundColor: '#ffffff99',
              borderColor: '#A1C2BD'
            }}
          >
            <div 
              className="w-16 h-16 rounded-lg flex items-center justify-center mb-6"
              style={{ backgroundColor: '#A1C2BD33' }}
            >
              <FileSignature className="w-8 h-8" style={{ color: '#708993' }} />
            </div>
            <h3 className="text-2xl font-bold mb-4" style={{ color: '#19183B' }}>
              Digital Signing
            </h3>
            <p style={{ color: '#708993' }}>
              Sign your documents securely with PNPKI DICT compliant digital signatures that are legally binding and tamper-proof
            </p>
          </div>

          <div 
            className="backdrop-blur-md border rounded-xl p-8 transition-all duration-300 hover:shadow-xl"
            style={{ 
              backgroundColor: '#ffffff99',
              borderColor: '#A1C2BD'
            }}
          >
            <div 
              className="w-16 h-16 rounded-lg flex items-center justify-center mb-6"
              style={{ backgroundColor: '#A1C2BD33' }}
            >
              <ShieldCheck className="w-8 h-8" style={{ color: '#708993' }} />
            </div>
            <h3 className="text-2xl font-bold mb-4" style={{ color: '#19183B' }}>
              Verification
            </h3>
            <p style={{ color: '#708993' }}>
              Instantly verify the authenticity of digitally signed documents and ensure they haven't been altered
            </p>
          </div>

          <div 
            className="backdrop-blur-md border rounded-xl p-8 transition-all duration-300 hover:shadow-xl"
            style={{ 
              backgroundColor: '#ffffff99',
              borderColor: '#A1C2BD'
            }}
          >
            <div 
              className="w-16 h-16 rounded-lg flex items-center justify-center mb-6"
              style={{ backgroundColor: '#A1C2BD33' }}
            >
              <Users className="w-8 h-8" style={{ color: '#708993' }} />
            </div>
            <h3 className="text-2xl font-bold mb-4" style={{ color: '#19183B' }}>
              Trusted Platform
            </h3>
            <p style={{ color: '#708993' }}>
              Built on the Philippine National Public Key Infrastructure for government-grade security and compliance
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="relative z-10 backdrop-blur-md border-t py-8"
        style={{ backgroundColor: '#19183Bee', borderColor: '#708993' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center" style={{ color: '#A1C2BD' }}>
            <p className="mb-2 font-semibold" style={{ color: '#E7F2EF' }}>
              ICTD - Bureau of OPPR
            </p>
            <p>National Commission on Indigenous Peoples</p>
            <p className="mt-4">&copy; 2025 {import.meta.env.VITE_APP_NAME || 'AppName'}. All rights reserved.</p>
            <p className="mt-2 text-sm">
              Developed by NCIP-OPPR-ICTD
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Pluma;