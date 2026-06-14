import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. API Lấy danh sách câu hỏi (Dành cho trang quản trị Admin)
export async function GET() {
  try {
    const questions = await prisma.question.findMany({
      orderBy: { id: 'desc' }, // Câu hỏi mới thêm sẽ lên đầu
    });
    return NextResponse.json({ success: true, data: questions });
  } catch (error: any) {
    console.error("Lỗi GET /api/questions:", error);
    return NextResponse.json(
      { success: false, error: 'Không thể kết nối hoặc truy xuất MySQL' }, 
      { status: 500 }
    );
  }
}

// 2. API Thêm câu hỏi mới (Dành cho Admin bấm tạo thủ công)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Tạo bản ghi mới trong MySQL qua Prisma
    const newQuestion = await prisma.question.create({
      data: {
        q_num: body.q_num ? Number(body.q_num) : null,
        q_text: body.q_text || "",
        options: body.options || "",
        answer: body.answer || "",
        domain: body.domain || "",
        exp_en: body.exp_en || "",
        exp_vi: body.exp_vi || "",
      },
    });

    return NextResponse.json({ success: true, data: newQuestion }, { status: 201 });
  } catch (error: any) {
    console.error("Lỗi POST /api/questions:", error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi ghi dữ liệu vào MySQL' }, 
      { status: 500 }
    );
  }
}