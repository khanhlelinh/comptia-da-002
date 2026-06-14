import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // Nhận cấu hình từ người dùng (VD: { "Data analysis": 10, "Data governance": 5 })
    const body = await request.json();
    const { domainConfig } = body; 

    if (!domainConfig) {
      return NextResponse.json({ success: false, error: 'Thiếu cấu hình bài thi' }, { status: 400 });
    }

    let examQuestions: any[] = [];

    // Lặp qua từng chủ đề và lấy số lượng câu hỏi tương ứng
    for (const [domain, limit] of Object.entries(domainConfig)) {
      const takeCount = Number(limit);
      
      if (takeCount > 0) {
        const questions = await prisma.question.findMany({
          where: { domain: domain },
          take: takeCount, // Giới hạn số lượng câu
        });
        
        examQuestions = examQuestions.concat(questions);
      }
    }

    // Thuật toán xáo trộn mảng (Fisher-Yates Shuffle) để câu hỏi không bị theo thứ tự cố định
    for (let i = examQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [examQuestions[i], examQuestions[j]] = [examQuestions[j], examQuestions[i]];
    }

    return NextResponse.json({
      success: true,
      total_questions: examQuestions.length,
      data: examQuestions
    });

  } catch (error: any) {
    console.error("Lỗi khi tạo đề thi:", error);
    return NextResponse.json({ success: false, error: 'Lỗi Server khi tạo đề thi' }, { status: 500 });
  }
}