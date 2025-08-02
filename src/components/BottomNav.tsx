'use client';

import { useState } from 'react';
import { IoHomeSharp, IoNewspaperOutline, IoPersonCircleOutline } from 'react-icons/io5';
import { RiServiceLine } from 'react-icons/ri';
import { usePathname } from 'next/navigation';
import VibrateLink from '@/components/ui/VibrateLink';
import GeneralBookingModal from './GeneralBookingModal';

const BottomNav = () => {
  const pathname = usePathname();
  const [showBookingModal, setShowBookingModal] = useState(false);
  
  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 pb-2">
        <div className="relative w-[90%] max-w-md mx-auto flex justify-between items-center px-3 sm:px-6 py-2 bg-gray-800/50 backdrop-blur-md rounded-full shadow-lg border border-white/20">
          <VibrateLink href="/" className="flex flex-col items-center group relative">
            <div className={`flex items-center justify-center ${pathname === '/' ? 'nav-icon-active' : ''}`}>
              <IoHomeSharp size={20} className={`${pathname === '/' ? 'text-[#77CFD2]' : 'text-white'} group-hover:scale-110 group-active:scale-90 transition-all duration-200`} />
            </div>
            <span className={`text-xs mt-0.5 ${pathname === '/' ? 'text-[#77CFD2]' : 'text-white'} font-medium transition-colors duration-300`}>Главная</span>
          </VibrateLink>
          
          <VibrateLink href="/services" className="flex flex-col items-center group relative">
            <div className={`flex items-center justify-center ${pathname === '/services' ? 'nav-icon-active' : ''}`}>
              <RiServiceLine size={20} className={`${pathname === '/services' ? 'text-[#77CFD2]' : 'text-white'} group-hover:scale-110 group-active:scale-90 transition-all duration-200`} />
            </div>
            <span className={`text-xs mt-0.5 ${pathname === '/services' ? 'text-[#77CFD2]' : 'text-white'} font-medium transition-colors duration-300`}>Услуги</span>
          </VibrateLink>
          
          {/* Кнопка записи по центру */}
          <div className="flex flex-col items-center mx-1">
            <div className="glow-button-container">
              <button 
                className="glow-button relative rounded-full px-4 py-2 overflow-hidden active:scale-95 transition-transform duration-150"
                onClick={() => setShowBookingModal(true)}
              >
                <span className="relative z-10 text-xs text-white font-medium">ЗАПИСАТЬСЯ</span>
                <svg width="100%" height="100%" className="absolute left-0 top-0">
                  <rect width="100%" height="100%" className="glow-border" rx="20" ry="20" />
                </svg>
              </button>
            </div>
          </div>
          
          <VibrateLink href="/blog" className="flex flex-col items-center group relative">
            <div className={`flex items-center justify-center ${pathname === '/blog' ? 'nav-icon-active' : ''}`}>
              <IoNewspaperOutline size={20} className={`${pathname === '/blog' ? 'text-[#77CFD2]' : 'text-white'} group-hover:scale-110 group-active:scale-90 transition-all duration-200`} />
            </div>
            <span className={`text-xs mt-0.5 ${pathname === '/blog' ? 'text-[#77CFD2]' : 'text-white'} font-medium transition-colors duration-300`}>Статьи</span>
          </VibrateLink>
          
          <VibrateLink href="/cabinet" className="flex flex-col items-center group relative">
            <div className={`flex items-center justify-center ${pathname === '/cabinet' ? 'nav-icon-active' : ''}`}>
              <IoPersonCircleOutline size={20} className={`${pathname === '/cabinet' ? 'text-[#77CFD2]' : 'text-white'} group-hover:scale-110 group-active:scale-90 transition-all duration-200`} />
            </div>
            <span className={`text-xs mt-0.5 ${pathname === '/cabinet' ? 'text-[#77CFD2]' : 'text-white'} font-medium transition-colors duration-300`}>Кабинет</span>
          </VibrateLink>
        </div>

        {/* Стили для кнопки со свечением */}
        <style jsx>{`
          .glow-button-container {
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          
          .glow-button {
            background-color: rgba(72, 169, 166, 0.3);
            border: none;
            cursor: pointer;
            transition: all 0.3s;
          }
          
          .glow-button:active {
            background-color: #48a9a6;
            transition: background-color 0.1s;
          }
          
          .glow-border {
            fill: none;
            stroke: #48a9a6;
            stroke-width: 2;
            stroke-dasharray: 150 480;
            stroke-dashoffset: 150;
            animation: glow 4s linear infinite;
          }
          
          @keyframes glow {
            0% {
              stroke-dashoffset: 150;
              stroke: #48a9a6;
              stroke-width: 2;
            }
            50% {
              stroke: #7feeed;
              stroke-width: 3;
            }
            100% {
              stroke-dashoffset: -330;
              stroke: #48a9a6;
              stroke-width: 2;
            }
          }
          
          .nav-icon-active:before {
            content: '';
            position: absolute;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: rgba(119, 207, 210, 0.15);
            z-index: -1;
            animation: pulse 2s infinite;
          }
          
          @keyframes pulse {
            0% {
              box-shadow: 0 0 0 0 rgba(119, 207, 210, 0.4);
            }
            70% {
              box-shadow: 0 0 0 8px rgba(119, 207, 210, 0);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(119, 207, 210, 0);
            }
          }
        `}</style>
      </nav>
      
      {/* Модальное окно бронирования */}
      <GeneralBookingModal 
        isOpen={showBookingModal} 
        onClose={() => setShowBookingModal(false)}
      />
    </>
  );
};

export default BottomNav; 