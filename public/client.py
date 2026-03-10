import sys
import os
import subprocess
import json
import base64
import winreg
import requests
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                             QHBoxLayout, QPushButton, QLabel, QComboBox, 
                             QMessageBox, QFrame)
from PyQt6.QtCore import Qt, QThread, pyqtSignal, QTimer
from PyQt6.QtGui import QIcon, QFont, QColor, QPalette

# Configuration
API_URL = "https://ais-dev-6xflfvihmg5y6itrfma5vs-535656641366.asia-east1.run.app" # Replace with your actual API URL

class VPNThread(QThread):
    status_signal = pyqtSignal(str)
    error_signal = pyqtSignal(str)

    def __init__(self, server_config):
        super().__init__()
        self.server_config = server_config
        self.process = None

    def run(self):
        try:
            # Decode Shadowsocks URI: ss://BASE64(method:password)@ip:port#name
            uri = self.server_config['access_key']
            if '#' in uri:
                uri = uri.split('#')[0]
            
            # Extract credentials and address
            credentials_part, address_part = uri.replace('ss://', '').split('@')
            credentials = base64.b64decode(credentials_part).decode('utf-8')
            method, password = credentials.split(':')
            ip, port = address_part.split(':')

            # Start ss-local.exe (Shadowsocks client)
            # You must bundle ss-local.exe with your application
            cmd = [
                "ss-local.exe",
                "-s", ip,
                "-p", port,
                "-k", password,
                "-m", method,
                "-l", "1080", # Local SOCKS5 port
                "-b", "127.0.0.1"
            ]
            
            self.status_signal.emit("Connecting...")
            self.process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            self.status_signal.emit("Connected")
            
            # Wait for process to finish
            self.process.wait()
            
        except Exception as e:
            self.error_signal.emit(str(e))

    def stop(self):
        if self.process:
            self.process.terminate()
            self.process = None
        self.status_signal.emit("Disconnected")

class TeamVPNClient(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("TeamVPN Client")
        self.setFixedSize(350, 550)
        self.is_connected = False
        self.vpn_thread = None
        
        self.setup_ui()

    def setup_ui(self):
        # Main Widget
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)
        layout.setContentsMargins(30, 40, 30, 40)
        layout.setSpacing(20)

        # Header
        header = QLabel("TeamVPN")
        header.setFont(QFont("Segoe UI", 24, QFont.Weight.Bold))
        header.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(header)

        # Status Indicator
        self.status_label = QLabel("Ready to Connect")
        self.status_label.setFont(QFont("Segoe UI", 12))
        self.status_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.status_label.setStyleSheet("color: #888;")
        layout.addWidget(self.status_label)

        # Key Input
        key_label = QLabel("Access Key")
        key_label.setFont(QFont("Segoe UI", 9, QFont.Weight.Bold))
        key_label.setStyleSheet("color: #666; text-transform: uppercase;")
        layout.addWidget(key_label)

        self.key_input = QTextEdit()
        self.key_input.setPlaceholderText("Paste your ss:// key here...")
        self.key_input.setFixedHeight(100)
        self.key_input.setStyleSheet("""
            QTextEdit {
                border: 1px solid #ddd;
                border-radius: 10px;
                padding: 10px;
                background: #f9f9f9;
                font-family: 'Consolas', 'Monaco', monospace;
                font-size: 10px;
            }
        """)
        layout.addWidget(self.key_input)

        # Connect Button
        self.connect_btn = QPushButton("CONNECT")
        self.connect_btn.setFixedHeight(60)
        self.connect_btn.setFont(QFont("Segoe UI", 14, QFont.Weight.Bold))
        self.connect_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.connect_btn.setStyleSheet("""
            QPushButton {
                background-color: #0078d4;
                color: white;
                border: none;
                border-radius: 30px;
            }
            QPushButton:hover {
                background-color: #106ebe;
            }
        """)
        self.connect_btn.clicked.connect(self.toggle_connection)
        layout.addWidget(self.connect_btn)

        # Info Section
        info_frame = QFrame()
        info_frame.setStyleSheet("background: #f5f5f5; border-radius: 10px;")
        info_layout = QVBoxLayout(info_frame)
        
        self.ip_label = QLabel("Local Proxy: 127.0.0.1:1080")
        self.ip_label.setFont(QFont("Segoe UI", 9))
        self.ip_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        info_layout.addWidget(self.ip_label)
        
        layout.addWidget(info_frame)

    def toggle_connection(self):
        if not self.is_connected:
            self.start_vpn()
        else:
            self.stop_vpn()

    def start_vpn(self):
        access_key = self.key_input.toPlainText().strip()
        if not access_key.startswith("ss://"):
            QMessageBox.warning(self, "Invalid Key", "Please paste a valid Shadowsocks access key (starting with ss://)")
            return
        
        server_config = {'access_key': access_key}
        self.vpn_thread = VPNThread(server_config)
        self.vpn_thread.status_signal.connect(self.update_status)
        self.vpn_thread.error_signal.connect(self.show_error)
        self.vpn_thread.start()
        
        # Set Windows System Proxy
        self.set_system_proxy(True)
        
        self.is_connected = True
        self.connect_btn.setText("DISCONNECT")
        self.connect_btn.setStyleSheet("""
            QPushButton {
                background-color: #d83b01;
                color: white;
                border: none;
                border-radius: 30px;
            }
            QPushButton:hover {
                background-color: #a4262c;
            }
        """)
        self.key_input.setEnabled(False)

    def stop_vpn(self):
        if self.vpn_thread:
            self.vpn_thread.stop()
            self.vpn_thread = None
        
        # Disable Windows System Proxy
        self.set_system_proxy(False)
        
        self.is_connected = False
        self.connect_btn.setText("CONNECT")
        self.connect_btn.setStyleSheet("""
            QPushButton {
                background-color: #0078d4;
                color: white;
                border: none;
                border-radius: 30px;
            }
            QPushButton:hover {
                background-color: #106ebe;
            }
        """)

    def update_status(self, status):
        self.status_label.setText(status)
        if status == "Connected":
            self.status_label.setStyleSheet("color: #107c10;")
        elif status == "Disconnected":
            self.status_label.setStyleSheet("color: #888;")

    def show_error(self, error):
        QMessageBox.critical(self, "Error", f"VPN Error: {error}")
        self.stop_vpn()

    def set_system_proxy(self, enable):
        try:
            # Registry path for Internet Settings
            path = r"Software\Microsoft\Windows\CurrentVersion\Internet Settings"
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, path, 0, winreg.KEY_ALL_ACCESS)
            
            if enable:
                # Enable proxy and set SOCKS5 address
                winreg.SetValueEx(key, "ProxyEnable", 0, winreg.REG_DWORD, 1)
                winreg.SetValueEx(key, "ProxyServer", 0, winreg.REG_SZ, "socks=127.0.0.1:1080")
            else:
                # Disable proxy
                winreg.SetValueEx(key, "ProxyEnable", 0, winreg.REG_DWORD, 0)
            
            winreg.CloseKey(key)
            
            # Refresh settings (optional, but recommended)
            # This is a simplified version; real apps use InternetSetOption API
            
        except Exception as e:
            print(f"Error setting system proxy: {e}")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = TeamVPNClient()
    window.show()
    sys.exit(app.exec())
