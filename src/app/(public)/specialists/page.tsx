export const dynamic = "force-dynamic";

import SpecialistsListClient from "@/components/SpecialistsListClient";
import { specialistsAPI } from "@/database/api/specialists";
import { servicesAPI } from "@/database/api/services";
import { db } from "@/database/db";

async function getSpecialistsData() {
  try {
    // Получаем данные напрямую из базы данных
    const specialists = specialistsAPI.getAll();
    const services = servicesAPI.getAll();
    
    // Получаем опубликованные отзывы напрямую из базы данных
    const reviews = db.prepare(`
      SELECT * FROM reviews
      WHERE isPublished = 1
      ORDER BY createdAt DESC
    `).all();
    
    console.log("Получено специалистов:", specialists?.length || 0);
    
    return { specialists, services, reviews };
  } catch (error) {
    console.error("Ошибка при загрузке данных:", error);
    return { specialists: [], services: [], reviews: [] };
  }
}

export default async function SpecialistsPage() {
  const { specialists, services, reviews } = await getSpecialistsData();
  return <SpecialistsListClient specialists={specialists} services={services} reviews={reviews} />;
}
