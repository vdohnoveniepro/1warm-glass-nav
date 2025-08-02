
import React from 'react';
import { Search } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ServiceCard from '@/components/ui/ServiceCard';

const Services = () => {
  // Sample services data
  const services = [
    { id: '1', title: 'Первая бесплатная консультация', duration: '30 мин', price: '0', specialist: 'Любой специалист' },
    { id: '2', title: 'ВсеЛенская терапия', duration: '2 ч', price: '4000', specialist: 'Анна Иванова' },
    { id: '3', title: 'Легализация правды', duration: '2 ч', price: '4000', specialist: 'Михаил Петров' },
    { id: '4', title: 'Таро', duration: '1 ч', price: '2500', specialist: 'Елена Смирнова' },
    { id: '5', title: 'Регрессия', duration: '3 ч', price: '4000', specialist: 'Сергей Козлов' },
    { id: '6', title: 'Нумерология', duration: '1 ч', price: '1500', specialist: 'Анна Иванова' },
    { id: '7', title: 'Ведическая Астрология', duration: '3 ч', price: '2500', specialist: 'Ольга Соколова' },
    { id: '8', title: 'Руны', duration: '1 ч', price: '2000', specialist: 'Дмитрий Волков' },
    { id: '9', title: 'Волшебная лавка артефактов', duration: '1 ч', price: '3500', specialist: 'Елена Смирнова' },
    { id: '10', title: 'PWS - Работа с подсознанием', duration: '3 ч', price: '2000', specialist: 'Михаил Петров' },
    { id: '11', title: 'Васту', duration: '1 ч', price: '2000', specialist: 'Сергей Козлов' },
  ];

  // State for search and filtering
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filteredServices, setFilteredServices] = React.useState(services);

  // Handle search
  React.useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredServices(services);
    } else {
      const filtered = services.filter(service => 
        service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.specialist.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredServices(filtered);
    }
  }, [searchTerm]);

  return (
    <Layout>
      <div className="animate-fade-in">
        <h1 className="text-2xl font-semibold mb-6 text-warmgray-800">Наши услуги</h1>
        
        {/* Search */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-warmgray-400" />
          </div>
          <input
            type="text"
            placeholder="Поиск услуг или специалистов"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-3 w-full rounded-lg bg-white/70 backdrop-blur-sm border border-warmbeige-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
          />
        </div>
        
        {/* Services List */}
        <div className="space-y-4">
          {filteredServices.length > 0 ? (
            filteredServices.map((service) => (
              <ServiceCard
                key={service.id}
                id={service.id}
                title={service.title}
                duration={service.duration}
                price={service.price}
                specialist={service.specialist}
              />
            ))
          ) : (
            <div className="text-center py-10 text-warmgray-600">
              <p>Услуги не найдены</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Services;
