import { NextRequest, NextResponse } from "next/server";
import { cleanupRelations } from "@/lib/api";

// POST /api/admin/cleanup - очистка неактуальных связей
export async function POST(request: NextRequest) {
  try {
    const success = cleanupRelations();
    
    if (!success) {
      return NextResponse.json(
        { error: 'Ошибка при очистке неактуальных связей' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, message: 'Неактуальные связи успешно очищены' });
  } catch (error) {
    console.error('Ошибка при выполнении очистки неактуальных связей:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера при выполнении очистки' },
      { status: 500 }
    );
  }
} 