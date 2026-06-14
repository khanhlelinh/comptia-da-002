# Mapping màu chuẩn Tailwind CSS sang QSS cho PyQt6
TAILWIND = {
    "bg": "#F9FAFB",          # gray-50
    "surface": "#FFFFFF",     # white
    "primary": "#3B82F6",     # blue-500
    "primary_hover": "#2563EB",# blue-600
    "text": "#111827",        # gray-900
    "text_sec": "#6B7280",    # gray-500
    "border": "#E5E7EB",      # gray-200
    "header": "#F3F4F6",      # gray-100
    "row_alt": "#F9FAFB",     # gray-50
    "success": "#10B981",     # green-500
    "danger": "#EF4444",      # red-500
    "disabled_bg": "#E5E7EB", # gray-200 (Nền nút khi bị mờ)
    "disabled_text": "#6B7280"# gray-500 (Chữ nút khi bị mờ)
}

QSS_STYLESHEET = f"""
QMainWindow {{ background-color: {TAILWIND['bg']}; }}
QWidget {{ background-color: {TAILWIND['bg']}; }}

QPushButton {{
    background-color: {TAILWIND['primary']}; 
    color: white; 
    border: none;
    border-radius: 6px; 
    padding: 8px 16px; 
    font-weight: 600; 
    font-size: 13px;
}}
QPushButton:hover {{ 
    background-color: {TAILWIND['primary_hover']}; 
}}
QPushButton:disabled {{ 
    background-color: {TAILWIND['disabled_bg']}; 
    color: {TAILWIND['disabled_text']}; 
}}

QComboBox {{
    background-color: {TAILWIND['surface']}; 
    border: 1px solid {TAILWIND['border']};
    border-radius: 6px; 
    padding: 6px 10px; 
    min-width: 120px; 
    color: {TAILWIND['text']};
}}
QComboBox::drop-down {{ 
    border: none; 
    width: 20px; 
}}
QComboBox QAbstractItemView {{ 
    background-color: {TAILWIND['surface']}; 
    color: {TAILWIND['text']}; 
    selection-background-color: {TAILWIND['primary']}; 
}}

QTableWidget {{
    background-color: {TAILWIND['surface']}; 
    border: 1px solid {TAILWIND['border']};
    border-radius: 8px; 
    gridline-color: {TAILWIND['border']};
    alternate-background-color: {TAILWIND['row_alt']}; 
    color: {TAILWIND['text']};
}}
QTableWidget::item {{ 
    padding: 8px; 
}}

QHeaderView::section {{
    background-color: {TAILWIND['header']}; 
    color: {TAILWIND['text']};
    padding: 12px 8px; 
    border: none; 
    border-bottom: 2px solid {TAILWIND['border']};
    font-weight: 700; 
    font-size: 12px; 
    text-align: center;
}}

QProgressBar {{
    border: 1px solid {TAILWIND['border']}; 
    border-radius: 6px;
    text-align: center; 
    background-color: {TAILWIND['header']}; 
    height: 20px;
    color: {TAILWIND['text']};
}}
QProgressBar::chunk {{ 
    background-color: {TAILWIND['success']}; 
    border-radius: 4px; 
}}

QLabel {{ 
    color: {TAILWIND['text']}; 
    background-color: transparent; 
}}
"""