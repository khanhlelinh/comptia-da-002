import sys
from PyQt6.QtWidgets import QApplication
from PyQt6.QtGui import QFont
from ui.main_window import MainWindow
from ui.styles import QSS_STYLESHEET

def main():
    app = QApplication(sys.argv)
    app.setStyleSheet(QSS_STYLESHEET)
    app.setFont(QFont("Segoe UI", 11))
    
    win = MainWindow()
    win.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()