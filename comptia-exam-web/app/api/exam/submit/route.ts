import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. API Học viên nộp bài thi (POST)
export async function POST(request: Request) {
  try {
    const { nickname, userAnswers } = await request.json(); 
    // userAnswers dạng: [ { questionId: 1, selected: 'A' }, { questionId: 2, selected: 'C' } ]

    if (!nickname || !userAnswers || userAnswers.length === 0) {
      return NextResponse.json({ success: false, error: 'Dữ liệu bài thi không hợp lệ' }, { status: 400 });
    }

    // Lấy danh sách ID câu hỏi người dùng đã làm để check đáp án chuẩn từ MySQL
    const qIds = userAnswers.map((ua: any) => ua.questionId);
    const dbQuestions = await prisma.question.findMany({
      where: { id: { in: qIds } }
    });

    let correctCount = 0;
    const reportDetails: any[] = [];

    // Tiến hành chấm điểm từng câu
    dbQuestions.forEach((q) => {
      const userAns = userAnswers.find((ua: any) => ua.questionId === q.id);
      const selected = userAns ? userAns.selected?.trim().toUpperCase() : '';
      const correct = (q.answer || '').trim().toUpperCase();
      const isCorrect = selected === correct;

      if (isCorrect) correctCount++;

      reportDetails.push({
        q_num: q.q_num,
        q_text: q.q_text,
        options: q.options,
        correct_answer: correct,
        user_answer: selected,
        is_correct: isCorrect,
        exp_vi: q.exp_vi
      });
    });

    const totalQuestions = dbQuestions.length;
    // Tính điểm theo hệ số 10, làm tròn 2 chữ số thập phân
    const score = parseFloat(((correctCount / totalQuestions) * 10).toFixed(2));

    // Lưu kết quả bài thi này vào lịch sử MySQL
    const savedRecord = await prisma.examHistory.create({
      data: {
        nickname: nickname,
        total_q: totalQuestions,
        correct_q: correctCount,
        score: score,
        details: JSON.stringify(reportDetails) // Ép mảng kết quả thành chuỗi để lưu vào LongText
      }
    });

    // Trả kết quả chấm thi ngay lập tức về cho Frontend hiển thị cho học viên xem
    return NextResponse.json({
      success: true,
      recordId: savedRecord.id,
      score: score,
      correct_q: correctCount,
      total_q: totalQuestions,
      details: reportDetails
    });

  } catch (error: any) {
    console.error("Lỗi POST /api/exam/submit:", error);
    return NextResponse.json({ success: false, error: 'Lỗi server khi nộp bài' }, { status: 500 });
  }
}

// 2. API Admin lấy danh sách lịch sử thi của các học viên (GET)
export async function GET() {
  try {
    const histories = await prisma.examHistory.findMany({
      orderBy: { createdAt: 'desc' } // Bài thi mới nộp đưa lên đầu
    });
    return NextResponse.json({ success: true, data: histories });
  } catch (error) {
    console.error("Lỗi GET /api/exam/submit:", error);
    return NextResponse.json({ success: false, error: 'Lỗi server khi lấy lịch sử' }, { status: 500 });
  }
}