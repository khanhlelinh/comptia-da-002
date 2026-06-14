import fitz
import re
from PyQt6.QtCore import QThread, pyqtSignal
from core.extractor import PDFQuestionExtractor

class ExamParserWorker(QThread):
    progress = pyqtSignal(int, int, dict)
    finished = pyqtSignal()
    error = pyqtSignal(str)

    def __init__(self, pdf_path: str, model_name: str, host: str = None, start_idx: int = 0):
        super().__init__()
        self.pdf_path = pdf_path
        self.model_name = model_name
        self.host = host
        self.start_idx = start_idx
        self.is_running = True # Cờ trạng thái để kiểm soát Tạm dừng

    def stop(self):
        """Hàm nhận tín hiệu dừng từ Main Window"""
        self.is_running = False

    def run(self):
        try:
            doc = fitz.open(self.pdf_path)
            full_text = ""
            for page in doc:
                full_text += page.get_text() + "\n"
            doc.close()

            full_text = re.sub(r'Questions and Answers PDF', '', full_text, flags=re.IGNORECASE)
            full_text = re.sub(r'https?://[^\s]+', '', full_text)
            full_text = re.sub(r'\n\s*\d+/\d+\s*\n', '\n', full_text)
            full_text = re.sub(r'={5,}', '', full_text)

            chunks = re.split(r'(Question:\s*\d+)', full_text)
            
            question_blocks = []
            for i in range(1, len(chunks), 2):
                q_title = chunks[i]
                q_body = chunks[i+1]
                question_blocks.append(q_title + "\n" + q_body)

            total_questions = len(question_blocks)
            
            if total_questions == 0:
                self.error.emit("Không tìm thấy format 'Question: X' nào trong PDF. Vui lòng kiểm tra lại file.")
                return

            extractor = PDFQuestionExtractor(self.model_name, self.host)

            # Vòng lặp bắt đầu từ start_idx thay vì 0
            for i in range(self.start_idx, total_questions):
                # Kiểm tra cờ Tạm dừng trước khi quét câu mới
                if not self.is_running:
                    break
                
                block = question_blocks[i]
                data = extractor.extract(block)
                if data and data.get("q_num") is not None:
                    self.progress.emit(i + 1, total_questions, data)
                else:
                    self.progress.emit(i + 1, total_questions, {"q_num": None})

            self.finished.emit()
            
        except Exception as e:
            self.error.emit(str(e))