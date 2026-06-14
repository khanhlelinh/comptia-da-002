import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. Nhận "báo cáo" từ thí sinh (POST)
export async function POST(request: Request) {
  try {
    const { nickname, current_q, total_q, is_peeking } = await request.json();
    if (!nickname) return NextResponse.json({ error: 'Thiếu nickname' }, { status: 400 });

    // Cập nhật hoặc tạo mới trạng thái của thí sinh này
    await prisma.examSession.upsert({
      where: { nickname: nickname },
      update: { current_q, total_q, is_peeking, updatedAt: new Date() },
      create: { nickname, current_q, total_q, is_peeking }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

// 2. Trả danh sách thí sinh đang active cho Admin (GET)
export async function GET() {
  try {
    // Chỉ lấy những thí sinh có tương tác trong vòng 2 phút gần nhất (120000ms)
    const twoMinsAgo = new Date(Date.now() - 120000);
    
    const activeSessions = await prisma.examSession.findMany({
      where: { updatedAt: { gte: twoMinsAgo } },
      orderBy: { updatedAt: 'desc' } // Người vừa thao tác lên đầu
    });
    
    return NextResponse.json({ success: true, data: activeSessions });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}