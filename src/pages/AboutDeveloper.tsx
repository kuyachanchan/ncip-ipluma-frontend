import { Building2, Target, Code, Award, Github, Linkedin, Twitter } from 'lucide-react';
import Navbar from '../components/Navbar';

const AboutDeveloper = () => {
  const developerInfo = {
    name: "Christian C. Cernechez",
    role: "Full-stack Developer",
    department: "ICTD - Bureau of OPPR",
    bio: "Passionate full-stack developer with 5+ years of experience in both government and private systems development. Specializes in creating efficient, user-friendly applications for public service.",
    expertise: [
      "Full Stack Development",
      "Government Systems Integration",
      "Database Management",
      "UI/UX Design",
      "System Architecture",
      "Project Management"
    ],
    education: "BS Information Technology - Polytechnic Institute of Tabaco",
    certifications: [
      "Civil Service Professional Eligibility",
      "Electronic Data Processing Specialist Eligibility",
    ],
    achievements: [
      /*{
        title: "Outstanding Developer Award",
        year: "2024",
        description: "Recognized for exceptional contribution to NCIP's digital transformation"
      },
      {
        title: "System Innovation Award",
        year: "2023",
        description: "Developed groundbreaking system for indigenous communities documentation"
      },
      {
        title: "5+ Years of Service Excellence",
        year: "2024",
        description: "Consistently delivering high-quality government systems"
      }*/
    ],
    techStack: [
        { name: "React", level: "Advanced" },
        { name: "PHP", level: "Advanced" },
        { name: "Java", level: "Advanced" },
        { name: "Javascript", level: "Advanced" },
        { name: "Laravel", level: "Advanced" },
        { name: "SpringBoot", level: "Advanced" },
      { name: "Typescript", level: "Intermediate" },
      { name: "PostgreSQL", level: "Advanced" },
      { name: "MySQL", level: "Advanced" },
      { name: "MS SQL Server", level: "Advanced" },
        { name: "MongoDB", level: "Intermediate" },
      { name: "Git", level: "Intermediate" },
      { name: "Docker", level: "Beginner" }
    ],
    projects: [
      {
        name: "iPluma",
        description: "Digital Document Management and Signing Platform"
      },
      {
        name: "DRIP",
        description: "Data Repository on Indigenous Peoples"
      },
    ]
  };

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
      <Navbar currentPage='About Developer'/>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" style={{ color: '#19183B' }}>
            About The Developer
          </h1>
          <div className="w-24 h-1 mx-auto" style={{ backgroundColor: '#708993' }}></div>
        </div>

        {/* Developer Profile Card */}
        <div className="backdrop-blur-md rounded-2xl shadow-xl p-8 mb-8 border" 
             style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderColor: '#708993' }}>
          <div className="flex flex-col md:flex-row gap-8">
            {/* Profile Picture Placeholder */}
            <div className="md:w-1/3">
              <div className="rounded-2xl overflow-hidden border-4" style={{ borderColor: '#A1C2BD' }}>
                <div className="aspect-square flex items-center justify-center" style={{ backgroundColor: '#19183B' }}>
                  <img src="https://i.ibb.co/RphkSkpr/received-376800696254561.jpg" alt="received 376800696254561"/>
                </div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="md:w-2/3">
              <h2 className="text-3xl font-bold mb-2" style={{ color: '#19183B' }}>{developerInfo.name}</h2>
              <p className="text-xl mb-4" style={{ color: '#708993' }}>{developerInfo.role}</p>
              <p className="text-lg mb-6" style={{ color: '#19183B' }}>{developerInfo.bio}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <Building2 size={20} style={{ color: '#708993' }} />
                  <span style={{ color: '#19183B' }}>{developerInfo.department}</span>
                </div>
              </div>

              {/* Social Links */}
              <div className="flex gap-4">
                <a href="#" className="p-2 rounded-full transition-colors duration-300" 
                   style={{ backgroundColor: '#19183B', color: '#E7F2EF' }}
                   onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#708993'}
                   onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#19183B'}>
                  <Github size={20} />
                </a>
                <a href="#" className="p-2 rounded-full transition-colors duration-300"
                   style={{ backgroundColor: '#19183B', color: '#E7F2EF' }}
                   onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#708993'}
                   onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#19183B'}>
                  <Linkedin size={20} />
                </a>
                <a href="#" className="p-2 rounded-full transition-colors duration-300"
                   style={{ backgroundColor: '#19183B', color: '#E7F2EF' }}
                   onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#708993'}
                   onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#19183B'}>
                  <Twitter size={20} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Expertise & Education */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="backdrop-blur-md rounded-2xl shadow-xl p-6 border" 
               style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderColor: '#708993' }}>
            <div className="flex items-center gap-3 mb-4">
              <Code size={24} style={{ color: '#19183B' }} />
              <h3 className="text-xl font-bold" style={{ color: '#19183B' }}>Expertise</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {developerInfo.expertise.map((skill, index) => (
                <span key={index} className="px-3 py-1 rounded-full text-sm"
                      style={{ backgroundColor: '#708993', color: '#E7F2EF' }}>
                  {skill}
                </span>
              ))}
            </div>
            
            <div className="mt-6">
              <h4 className="font-semibold mb-2" style={{ color: '#19183B' }}>Education</h4>
              <p style={{ color: '#708993' }}>{developerInfo.education}</p>
            </div>
          </div>

          <div className="backdrop-blur-md rounded-2xl shadow-xl p-6 border" 
               style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderColor: '#708993' }}>
            <div className="flex items-center gap-3 mb-4">
              <Award size={24} style={{ color: '#19183B' }} />
              <h3 className="text-xl font-bold" style={{ color: '#19183B' }}>Certifications</h3>
            </div>
            <ul className="space-y-2">
              {developerInfo.certifications.map((cert, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-lg" style={{ color: '#708993' }}>•</span>
                  <span style={{ color: '#19183B' }}>{cert}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Achievements */}
              {/*<div className="backdrop-blur-md rounded-2xl shadow-xl p-6 mb-8 border" 
             style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderColor: '#708993' }}>
          <div className="flex items-center gap-3 mb-6">
            <Telescope size={24} style={{ color: '#19183B' }} />
            <h3 className="text-xl font-bold" style={{ color: '#19183B' }}>Key Achievements</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {developerInfo.achievements.map((achievement, index) => (
              <div key={index} className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(112, 137, 147, 0.1)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Award size={20} style={{ color: '#708993' }} />
                  <h4 className="font-bold" style={{ color: '#19183B' }}>{achievement.title}</h4>
                </div>
                <p className="text-sm mb-1" style={{ color: '#708993' }}>{achievement.year}</p>
                <p className="text-sm" style={{ color: '#19183B' }}>{achievement.description}</p>
              </div>
            ))}
          </div>
        </div>*/}

        {/* Tech Stack & Projects */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="backdrop-blur-md rounded-2xl shadow-xl p-6 border" 
               style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderColor: '#708993' }}>
            <div className="flex items-center gap-3 mb-4">
              <Target size={24} style={{ color: '#19183B' }} />
              <h3 className="text-xl font-bold" style={{ color: '#19183B' }}>Tech Stack</h3>
            </div>
            <div className="space-y-3">
              {developerInfo.techStack.map((tech, index) => (
                <div key={index}>
                  <div className="flex justify-between mb-1">
                    <span style={{ color: '#19183B' }}>{tech.name}</span>
                    <span style={{ color: '#708993' }}>{tech.level}</span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#E7F2EF' }}>
                    <div className="h-2 rounded-full" 
                         style={{ 
                           width: tech.level === 'Expert' ? '90%' : tech.level === 'Advanced' ? '75%' : '60%',
                           backgroundColor: '#19183B' 
                         }}>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="backdrop-blur-md rounded-2xl shadow-xl p-6 border" 
               style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderColor: '#708993' }}>
            <div className="flex items-center gap-3 mb-4">
              <Building2 size={24} style={{ color: '#19183B' }} />
              <h3 className="text-xl font-bold" style={{ color: '#19183B' }}>Key Projects</h3>
            </div>
            <div className="space-y-4">
              {developerInfo.projects.map((project, index) => (
                <div key={index} className="border-b pb-3 last:border-0 last:pb-0" style={{ borderColor: '#708993' }}>
                  <h4 className="font-bold mb-1" style={{ color: '#19183B' }}>{project.name}</h4>
                  <p className="text-sm" style={{ color: '#708993' }}>{project.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 backdrop-blur-md border-t py-8" style={{ backgroundColor: '#19183Bee', borderColor: '#708993' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center" style={{ color: '#A1C2BD' }}>
            <p className="mb-2 font-semibold" style={{ color: '#E7F2EF' }}>
              ICTD - Bureau of OPPR
            </p>
            <p>National Commission on Indigenous Peoples</p>
            <p className="mt-4">&copy; 2025 {import.meta.env.VITE_APP_NAME || 'AppName'}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutDeveloper;