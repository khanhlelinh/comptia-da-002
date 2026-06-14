import os
import sys
import json
import sqlite3
import re
import math
from PyQt6.QtWidgets import (QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
                             QPushButton, QComboBox, QLabel, QTableWidget,
                             QTableWidgetItem, QFileDialog, QProgressBar, 
                             QMessageBox, QHeaderView, QApplication, QTextEdit)
from PyQt6.QtCore import Qt, QObject, pyqtSignal
from PyQt6.QtGui import QTextCursor

from ui.styles import QSS_STYLESHEET
from config.settings import (OLLAMA_MODELS, DEFAULT_MODEL, OLLAMA_HOST_LIST, 
                             DEFAULT_PORT, CONFIG_FILE)
from core.worker import ExamParserWorker

RESUME_FILE = "resume_state.json"

class EmittingStream(QObject):
    textWritten = pyqtSignal(str)
    def write(self, text):
        self.textWritten.emit(str(text))
    def flush(self): pass

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("CompTIA DA0-002 PDF Parser & Translator")
        self.resize(1600, 900)
        
        self.all_data = []
        self.current_page = 1
        self.items_per_page = 20
        self.processed_count = 0
        
        self.worker = None
        self.pdf_path = None
        self._setup_ui()
        self._load_config()

        sys.stdout = EmittingStream()
        sys.stdout.textWritten.connect(self._append_log)
        sys.stderr = EmittingStream()
        sys.stderr.textWritten.connect(self._append_log)

    def closeEvent(self, event):
        if self.worker and self.worker.isRunning():
            self.worker.stop()
            self.worker.wait(2000)
        self._save_resume_state()
        event.accept()

    def _append_log(self, text):
        cursor = self.log_console.textCursor()
        cursor.movePosition(QTextCursor.MoveOperation.End)
        cursor.insertText(text)
        self.log_console.setTextCursor(cursor)
        self.log_console.ensureCursorVisible()

    def _load_config(self):
        try:
            if os.path.exists(CONFIG_FILE):
                with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    if 'last_pdf_path' in config and os.path.exists(config['last_pdf_path']):
                        self.pdf_path = config['last_pdf_path']
                        self.lbl_path.setText(self.pdf_path)
                        self.lbl_path.setStyleSheet("color: #111827; font-weight: 600; background: transparent;")
                        self.btn_start.setEnabled(True)
                        self._load_resume_state()
        except: pass

    def _save_config(self):
        try:
            config = {'last_pdf_path': self.pdf_path} if self.pdf_path else {}
            with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
        except: pass

    def _load_resume_state(self):
        self.all_data = []
        self.processed_count = 0
        if os.path.exists(RESUME_FILE):
            try:
                with open(RESUME_FILE, 'r', encoding='utf-8') as f:
                    state = json.load(f)
                    if state.get("pdf_path") == self.pdf_path:
                        self.all_data = state.get("all_data", [])
                        self.processed_count = state.get("last_index", 0)
                        
                        if self.processed_count > 0:
                            self.pbar.setValue(self.processed_count)
                            self.pbar.setFormat(f"Đã lưu tiến trình ở câu {self.processed_count}. Sẵn sàng tiếp tục...")
                            total_pages = max(1, math.ceil(len(self.all_data) / self.items_per_page))
                            self.current_page = total_pages
                            self._update_table_view()
                            
                            # Kích hoạt các nút công cụ
                            self.btn_export_mysql.setEnabled(True)
                            self.btn_export_sqlite.setEnabled(True)
                            self.btn_classify.setEnabled(True)
            except: pass

    def _save_resume_state(self):
        if self.pdf_path and len(self.all_data) > 0:
            state = {
                "pdf_path": self.pdf_path,
                "last_index": self.processed_count,
                "all_data": self.all_data
            }
            with open(RESUME_FILE, 'w', encoding='utf-8') as f:
                json.dump(state, f, ensure_ascii=False)

    def _setup_ui(self):
        central = QWidget()
        central.setStyleSheet("background-color: #F9FAFB;")
        self.setCentralWidget(central)
        
        layout = QVBoxLayout(central)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(12)

        # ===== CONTROL BAR =====
        ctrl = QHBoxLayout()
        self.btn_open = QPushButton("📂 Chọn File PDF")
        self.btn_open.setMinimumWidth(180)
        self.btn_open.clicked.connect(self._pick_pdf)

        self.lbl_path = QLabel("Chưa chọn file...")
        self.lbl_path.setStyleSheet("color: #6B7280; font-style: italic; background: transparent;")
        self.lbl_path.setWordWrap(True)

        self.lbl_host = QLabel("🌐 Ollama Host:")
        self.lbl_host.setStyleSheet("background: transparent;")
        self.cmb_host = QComboBox()
        self.cmb_host.addItems(OLLAMA_HOST_LIST) 
        
        self.lbl_model = QLabel("🤖 Ollama Model:")
        self.lbl_model.setStyleSheet("background: transparent;")
        self.cmb_model = QComboBox()
        self.cmb_model.addItems(OLLAMA_MODELS)
        idx = self.cmb_model.findText(DEFAULT_MODEL)
        if idx != -1: self.cmb_model.setCurrentIndex(idx)

        self.btn_start = QPushButton("🚀 Bắt Đầu Quét")
        self.btn_start.setMinimumWidth(200)
        self.btn_start.clicked.connect(self._start)
        self.btn_start.setEnabled(False)

        self.btn_pause = QPushButton("⏸ Tạm Dừng")
        self.btn_pause.setMinimumWidth(150)
        self.btn_pause.setStyleSheet("background-color: #EF4444; color: white; border-radius: 6px; padding: 8px 16px; font-weight: 600;")
        self.btn_pause.clicked.connect(self._pause)
        self.btn_pause.setEnabled(False)

        ctrl.addWidget(self.btn_open)
        ctrl.addWidget(self.lbl_path, 1)
        ctrl.addStretch()
        ctrl.addWidget(self.lbl_host)
        ctrl.addWidget(self.cmb_host)
        ctrl.addWidget(self.lbl_model)
        ctrl.addWidget(self.cmb_model)
        ctrl.addWidget(self.btn_start)
        ctrl.addWidget(self.btn_pause)

        # ===== TOOL BAR (Export & Classify) =====
        tool_layout = QHBoxLayout()
        tool_layout.setAlignment(Qt.AlignmentFlag.AlignRight)
        
        self.btn_classify = QPushButton("🏷 Phân Loại Câu Hỏi")
        self.btn_classify.setStyleSheet("background-color: #8B5CF6; color: white; border-radius: 6px; padding: 6px 12px; font-weight: 600;") 
        self.btn_classify.clicked.connect(self._classify_data)
        self.btn_classify.setEnabled(False)

        self.btn_export_mysql = QPushButton("💾 Export MySQL (.sql)")
        self.btn_export_mysql.setStyleSheet("background-color: #F59E0B; color: white; border-radius: 6px; padding: 6px 12px; font-weight: 600;") 
        self.btn_export_mysql.clicked.connect(self._export_mysql)
        self.btn_export_mysql.setEnabled(False)

        self.btn_export_sqlite = QPushButton("💾 Export SQLite (.db)")
        self.btn_export_sqlite.setStyleSheet("background-color: #10B981; color: white; border-radius: 6px; padding: 6px 12px; font-weight: 600;")
        self.btn_export_sqlite.clicked.connect(self._export_sqlite)
        self.btn_export_sqlite.setEnabled(False)

        tool_layout.addWidget(self.btn_classify)
        tool_layout.addWidget(self.btn_export_mysql)
        tool_layout.addWidget(self.btn_export_sqlite)

        self.pbar = QProgressBar()
        self.pbar.setTextVisible(True)
        self.pbar.setFixedHeight(20)

        self.log_console = QTextEdit()
        self.log_console.setReadOnly(True)
        self.log_console.setFixedHeight(120)
        self.log_console.setStyleSheet("""
            QTextEdit { background-color: #121212; color: #4ADE80; font-family: Consolas, monospace; font-size: 13px; border-radius: 6px; padding: 8px; }
        """)

        # ===== BẢNG DỮ LIỆU (Tăng lên 7 cột) =====
        self.table = QTableWidget(0, 7)
        self.table.setHorizontalHeaderLabels([
            "Câu #", "Nội dung câu hỏi", "Danh sách đáp án", "Đáp án đúng", 
            "Phân loại", "Giải thích (EN)", "Giải thích (VI)"
        ])
        self.table.setWordWrap(True)
        self.table.verticalHeader().setVisible(False)
        self.table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        
        header = self.table.horizontalHeader()
        header.setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        header.setSectionResizeMode(0, QHeaderView.ResizeMode.Fixed) 
        self.table.setColumnWidth(0, 70) 
        header.setSectionResizeMode(3, QHeaderView.ResizeMode.Fixed) 
        self.table.setColumnWidth(3, 100)
        header.setSectionResizeMode(4, QHeaderView.ResizeMode.Fixed) 
        self.table.setColumnWidth(4, 160) # Cột phân loại
        header.setFixedHeight(45)

        # ===== 5. PAGINATION (Phân trang) =====
        page_layout = QHBoxLayout()
        page_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        # Thêm CSS cứng cho 2 nút này để ghi đè mọi style bị lỗi
        btn_style = """
            QPushButton { background-color: #3B82F6; color: white; border-radius: 6px; padding: 6px 12px; font-weight: bold; }
            QPushButton:disabled { background-color: #E5E7EB; color: #9CA3AF; }
        """
        
        self.btn_prev = QPushButton("◀ Trước")
        self.btn_prev.setFixedWidth(100)
        self.btn_prev.setStyleSheet(btn_style) # Ép style
        self.btn_prev.clicked.connect(self._prev_page)
        
        self.lbl_page = QLabel("Trang 1 / 1")
        self.lbl_page.setStyleSheet("font-weight: bold; font-size: 14px; color: #111827;") # Ép màu chữ đen
        self.lbl_page.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.lbl_page.setFixedWidth(120)

        self.btn_next = QPushButton("Sau ▶")
        self.btn_next.setFixedWidth(100)
        self.btn_next.setStyleSheet(btn_style) # Ép style
        self.btn_next.clicked.connect(self._next_page)

        page_layout.addWidget(self.btn_prev)
        page_layout.addWidget(self.lbl_page)
        page_layout.addWidget(self.btn_next)
        
        self._update_pagination_buttons()
        layout.addLayout(ctrl)
        layout.addLayout(tool_layout)
        layout.addWidget(self.pbar)
        layout.addWidget(self.log_console)
        layout.addWidget(self.table)
        layout.addLayout(page_layout)

    def _pick_pdf(self):
        path, _ = QFileDialog.getOpenFileName(self, "Chọn File PDF", "", "PDF (*.pdf)")
        if path:
            self.pdf_path = path
            self.lbl_path.setText(path)
            self.lbl_path.setStyleSheet("color: #111827; font-weight: 600; background: transparent;")
            self.btn_start.setEnabled(True)
            self._save_config()
            self._load_resume_state()
            self._update_table_view()

    def _start(self):
        if not self.pdf_path: return
        self.btn_start.setEnabled(False)
        self.btn_open.setEnabled(False)
        self.btn_pause.setEnabled(True)
        self.btn_export_mysql.setEnabled(False)
        self.btn_export_sqlite.setEnabled(False)
        self.btn_classify.setEnabled(False)
        
        self.pbar.setValue(self.processed_count)
        self.pbar.setFormat(f"Đang tiếp tục từ câu {self.processed_count + 1}...")
        self.log_console.clear()

        selected_host = f"http://{self.cmb_host.currentText()}"
        selected_model = self.cmb_model.currentText()

        self.worker = ExamParserWorker(self.pdf_path, selected_model, selected_host, start_idx=self.processed_count)
        self.worker.progress.connect(self._on_progress)
        self.worker.finished.connect(self._on_finished)
        self.worker.error.connect(self._on_error)
        self.worker.start()

    def _pause(self):
        if self.worker and self.worker.isRunning():
            self.worker.stop() 
            self.pbar.setFormat("⏳ Đang dừng... Vui lòng đợi lưu nốt câu hiện tại.")
            self.btn_pause.setEnabled(False)

    def _format_options(self, text):
        if not text: return ""
        formatted = re.sub(r'(?<!^)\s+([A-E]\.)', r'\n\1', str(text))
        return formatted.strip()

    # ================= LOGIC PHÂN LOẠI CÂU HỎI =================
    def _classify_data(self):
        if not self.all_data: return
        
        print("🔍 Đang đọc và phân tích dữ liệu để phân loại...")
        classified_count = 0
        
        for data in self.all_data:
            # Thuật toán tìm kiếm keyword trong phần giải thích tiếng Anh (hoặc nội dung câu hỏi)
            text_to_search = str(data.get("exp_en", "")) + " " + str(data.get("q_text", ""))
            text_to_search = text_to_search.lower()
            
            domain = ""
            if "concepts and environments" in text_to_search:
                domain = "Data concepts and environments"
            elif "acquisition and preparation" in text_to_search:
                domain = "Data acquisition and preparation"
            elif "data analysis" in text_to_search:
                domain = "Data analysis"
            elif "visualization and reporting" in text_to_search:
                domain = "Visualization and reporting"
            elif "data governance" in text_to_search:
                domain = "Data governance"
                
            data["domain"] = domain
            if domain:
                classified_count += 1
                
        self._save_resume_state()
        self._update_table_view()
        print(f"✅ Hoàn tất phân loại {classified_count}/{len(self.all_data)} câu hỏi.")
        QMessageBox.information(self, "Phân loại thành công", f"Đã quét và phân loại tự động {classified_count} câu hỏi!")

    def _on_progress(self, cur: int, total: int, data: dict):
        self.processed_count = cur
        self.pbar.setValue(cur)
        self.pbar.setFormat(f"Đang xử lý: {cur}/{total}")
        
        if data.get("q_num") is not None:
            data["options"] = self._format_options(data.get("options", ""))
            self.all_data.append(data)
            
            total_pages = max(1, math.ceil(len(self.all_data) / self.items_per_page))
            if self.current_page == total_pages:
                self._update_table_view()
            self._update_pagination_buttons()

    def _update_table_view(self):
        self.table.setRowCount(0)
        start_idx = (self.current_page - 1) * self.items_per_page
        end_idx = start_idx + self.items_per_page
        page_data = self.all_data[start_idx:end_idx]

        for data in page_data:
            row = self.table.rowCount()
            self.table.insertRow(row)

            def create_item(text, max_len=150):
                text_str = str(text).strip() if text else ""
                display_text = text_str if len(text_str) <= max_len else text_str[:max_len] + "..."
                item = QTableWidgetItem(display_text)
                item.setToolTip(text_str)
                item.setTextAlignment(Qt.AlignmentFlag.AlignTop | Qt.AlignmentFlag.AlignLeft)
                return item

            self.table.setItem(row, 0, create_item(data.get("q_num", "-"), 10))
            self.table.setItem(row, 1, create_item(data.get("q_text", ""), 120))
            self.table.setItem(row, 2, create_item(data.get("options", ""), 150))
            self.table.setItem(row, 3, create_item(data.get("answer", ""), 10))
            self.table.setItem(row, 4, create_item(data.get("domain", ""), 50)) # Cột phân loại
            self.table.setItem(row, 5, create_item(data.get("exp_en", ""), 180))
            self.table.setItem(row, 6, create_item(data.get("exp_vi", ""), 180))
            self.table.setRowHeight(row, 90)

        self._update_pagination_buttons()

    def _update_pagination_buttons(self):
        total_pages = max(1, math.ceil(len(self.all_data) / self.items_per_page))
        self.lbl_page.setText(f"Trang {self.current_page} / {total_pages}")
        self.btn_prev.setEnabled(self.current_page > 1)
        self.btn_next.setEnabled(self.current_page < total_pages)

    def _prev_page(self):
        if self.current_page > 1:
            self.current_page -= 1
            self._update_table_view()

    def _next_page(self):
        total_pages = max(1, math.ceil(len(self.all_data) / self.items_per_page))
        if self.current_page < total_pages:
            self.current_page += 1
            self._update_table_view()

    def _export_mysql(self):
        if not self.all_data: return
        path, _ = QFileDialog.getSaveFileName(self, "Lưu file MySQL Dump", "exam_data.sql", "SQL Files (*.sql)")
        if not path: return
        try:
            with open(path, 'w', encoding='utf-8') as f:
                f.write("CREATE TABLE IF NOT EXISTS questions (\n    id INT AUTO_INCREMENT PRIMARY KEY,\n    q_num INT,\n    q_text TEXT,\n    options TEXT,\n    answer VARCHAR(10),\n    domain VARCHAR(255),\n    exp_en TEXT,\n    exp_vi TEXT\n);\n\n")
                for d in self.all_data:
                    q_num = d.get('q_num') or 'NULL'
                    q_text = str(d.get('q_text', '')).replace("'", "''")
                    opts = str(d.get('options', '')).replace("'", "''")
                    ans = str(d.get('answer', '')).replace("'", "''")
                    domain = str(d.get('domain', '')).replace("'", "''")
                    en = str(d.get('exp_en', '')).replace("'", "''")
                    vi = str(d.get('exp_vi', '')).replace("'", "''")
                    sql = f"INSERT INTO questions (q_num, q_text, options, answer, domain, exp_en, exp_vi) VALUES ({q_num}, '{q_text}', '{opts}', '{ans}', '{domain}', '{en}', '{vi}');\n"
                    f.write(sql)
            QMessageBox.information(self, "Thành công", f"Đã xuất dữ liệu MySQL ra:\n{path}")
        except Exception as e:
            QMessageBox.critical(self, "Lỗi Export", f"Không thể lưu file SQL:\n{str(e)}")

    def _export_sqlite(self):
        if not self.all_data: return
        path, _ = QFileDialog.getSaveFileName(self, "Lưu file SQLite", "exam_data.sqlite", "SQLite DB (*.sqlite *.db)")
        if not path: return
        try:
            conn = sqlite3.connect(path)
            cursor = conn.cursor()
            cursor.execute('''CREATE TABLE IF NOT EXISTS questions (id INTEGER PRIMARY KEY AUTOINCREMENT, q_num INTEGER, q_text TEXT, options TEXT, answer TEXT, domain TEXT, exp_en TEXT, exp_vi TEXT)''')
            for d in self.all_data:
                cursor.execute('''INSERT INTO questions (q_num, q_text, options, answer, domain, exp_en, exp_vi) VALUES (?, ?, ?, ?, ?, ?, ?)''', (d.get('q_num'), d.get('q_text', ''), d.get('options', ''), d.get('answer', ''), d.get('domain', ''), d.get('exp_en', ''), d.get('exp_vi', '')))
            conn.commit()
            conn.close()
            QMessageBox.information(self, "Thành công", f"Đã xuất dữ liệu SQLite ra:\n{path}")
        except Exception as e:
            QMessageBox.critical(self, "Lỗi Export", f"Không thể lưu DB SQLite:\n{str(e)}")

    def _on_finished(self):
        self._save_resume_state() 
        
        if self.worker.is_running: 
            self.pbar.setFormat("✅ Hoàn thành toàn bộ!")
            print("✅ Đã hoàn thành quá trình trích xuất.")
            QMessageBox.information(self, "Thành công", f"Đã quét & dịch xong {len(self.all_data)} câu hỏi!")
        else:
            self.pbar.setFormat(f"⏸ Đã dừng ở câu {self.processed_count}.")
            print(f"⏸ Đã tạm dừng tại câu {self.processed_count}.")
        
        self._reset_controls()

    def _on_error(self, msg: str):
        self._save_resume_state()
        self._reset_controls()
        print(f"❌ Lỗi: {msg}")
        QMessageBox.critical(self, "Lỗi xử lý", f"Không thể tiếp tục:\n{msg}")

    def _reset_controls(self):
        self.btn_start.setEnabled(True)
        self.btn_open.setEnabled(True)
        self.btn_pause.setEnabled(False)
        self.cmb_host.setEnabled(True)
        self.cmb_model.setEnabled(True)
        if len(self.all_data) > 0:
            self.btn_export_mysql.setEnabled(True)
            self.btn_export_sqlite.setEnabled(True)
            self.btn_classify.setEnabled(True)