import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. API Cập nhật câu hỏi (PUT)
export async function PUT(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Trong Next.js 15+, params là một Promise nên phải dùng await
    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    
    const body = await request.json();

    const updatedQuestion = await prisma.question.update({
      where: { id: id },
      data: {
        q_num: body.q_num ? Number(body.q_num) : null,
        q_text: body.q_text,
        options: body.options,
        answer: body.answer,
        domain: body.domain,
        exp_en: body.exp_en,
        exp_vi: body.exp_vi,
      },
    });

    return NextResponse.json({ success: true, data: updatedQuestion });
  } catch (error: any) {
    console.error("Lỗi PUT /api/questions/[id]:", error);
    return NextResponse.json({ success: false, error: 'Lỗi khi cập nhật câu hỏi' }, { status: 500 });
  }
}

// 2. API Xóa câu hỏi (DELETE)
export async function DELETE(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Phải dùng await để lấy id
    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    
    await prisma.question.delete({
      where: { id: id },
    });

    return NextResponse.json({ success: true, message: 'Đã xóa thành công' });
  } catch (error: any) {
    console.error("Lỗi DELETE /api/questions/[id]:", error);
    return NextResponse.json({ success: false, error: 'Lỗi khi xóa câu hỏi' }, { status: 500 });
  }
}