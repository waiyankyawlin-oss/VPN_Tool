import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Server, 
  Key, 
  Plus, 
  Trash2, 
  Copy, 
  CheckCircle2, 
  Activity, 
  Globe,
  Download,
  Terminal,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VPNServer {
  id: number;
  name: string;
  ip: string;
  port: number;
  password: string;
  method: string;
  status?: 'online' | 'offline' | 'checking';
}

interface AccessKey {
  id: number;
  server_id: number;
  name: string;
  access_key: string;
  server_name: string;
  server_ip: string;
  created_at: string;
}

interface Droplet {
  id: number;
  name: string;
  networks: {
    v4: { ip_address: string; type: string }[];
  };
  status: string;
  region: { name: string };
}

export default function App() {
  const [servers, setServers] = useState<VPNServer[]>([]);
  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [droplets, setDroplets] = useState<Droplet[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'servers' | 'keys' | 'setup' | 'cloud'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [showPython, setShowPython] = useState(false);

  const clientCode = `import sys
import os
import subprocess
import json
import base64
import winreg
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                             QPushButton, QLabel, QTextEdit, QMessageBox, QFrame)
from PyQt6.QtCore import Qt, QThread, pyqtSignal
from PyQt6.QtGui import QFont

class VPNThread(QThread):
    status_signal = pyqtSignal(str)
    error_signal = pyqtSignal(str)

    def __init__(self, server_config):
        super().__init__()
        self.server_config = server_config
        self.process = None

    def run(self):
        try:
            uri = self.server_config['access_key']
            if '#' in uri: uri = uri.split('#')[0]
            credentials_part, address_part = uri.replace('ss://', '').split('@')
            credentials = base64.b64decode(credentials_part).decode('utf-8')
            method, password = credentials.split(':')
            ip, port = address_part.split(':')

            cmd = ["ss-local.exe", "-s", ip, "-p", port, "-k", password, "-m", method, "-l", "1080", "-b", "127.0.0.1"]
            self.status_signal.emit("Connecting...")
            self.process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            self.status_signal.emit("Connected")
            self.process.wait()
        except Exception as e:
            self.error_signal.emit(str(e))

    def stop(self):
        if self.process: self.process.terminate()
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
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)
        layout.setContentsMargins(30, 40, 30, 40)
        layout.setSpacing(20)

        header = QLabel("TeamVPN")
        header.setFont(QFont("Segoe UI", 24, QFont.Weight.Bold))
        header.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(header)

        self.status_label = QLabel("Ready to Connect")
        self.status_label.setFont(QFont("Segoe UI", 12))
        self.status_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.status_label.setStyleSheet("color: #888;")
        layout.addWidget(self.status_label)

        self.key_input = QTextEdit()
        self.key_input.setPlaceholderText("Paste your ss:// key here...")
        self.key_input.setFixedHeight(100)
        self.key_input.setStyleSheet("border: 1px solid #ddd; border-radius: 10px; padding: 10px; background: #f9f9f9;")
        layout.addWidget(self.key_input)

        self.connect_btn = QPushButton("CONNECT")
        self.connect_btn.setFixedHeight(60)
        self.connect_btn.setFont(QFont("Segoe UI", 14, QFont.Weight.Bold))
        self.connect_btn.setStyleSheet("background-color: #0078d4; color: white; border-radius: 30px;")
        self.connect_btn.clicked.connect(self.toggle_connection)
        layout.addWidget(self.connect_btn)

    def toggle_connection(self):
        if not self.is_connected:
            access_key = self.key_input.toPlainText().strip()
            if not access_key.startswith("ss://"): return
            self.vpn_thread = VPNThread({'access_key': access_key})
            self.vpn_thread.status_signal.connect(self.update_status)
            self.vpn_thread.start()
            self.set_system_proxy(True)
            self.is_connected = True
            self.connect_btn.setText("DISCONNECT")
        else:
            if self.vpn_thread: self.vpn_thread.stop()
            self.set_system_proxy(False)
            self.is_connected = False
            self.connect_btn.setText("CONNECT")

    def update_status(self, status):
        self.status_label.setText(status)

    def set_system_proxy(self, enable):
        path = r"Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, path, 0, winreg.KEY_ALL_ACCESS)
        winreg.SetValueEx(key, "ProxyEnable", 0, winreg.REG_DWORD, 1 if enable else 0)
        if enable: winreg.SetValueEx(key, "ProxyServer", 0, winreg.REG_SZ, "socks=127.0.0.1:1080")
        winreg.CloseKey(key)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = TeamVPNClient()
    window.show()
    sys.exit(app.exec())`;

  const installScript = `#!/bin/bash
# TeamVPN Server Installation Script
# For Ubuntu 22.04+

set -e
echo "Updating system..."
sudo apt update && sudo apt upgrade -y
echo "Installing Shadowsocks-libev..."
sudo apt install shadowsocks-libev -y

PORT=8388
PASSWORD=$(openssl rand -base64 12)
METHOD="chacha20-ietf-poly1305"

echo "Creating configuration..."
sudo tee /etc/shadowsocks-libev/config.json <<EOF
{
    "server":"0.0.0.0",
    "server_port":$PORT,
    "local_port":1080,
    "password":"$PASSWORD",
    "timeout":60,
    "method":"$METHOD",
    "fast_open":true,
    "nameserver":"8.8.8.8",
    "mode":"tcp_and_udp"
}
EOF

echo "Restarting service..."
sudo systemctl restart shadowsocks-libev
sudo systemctl enable shadowsocks-libev
echo "Configuring firewall..."
sudo ufw allow $PORT/tcp
sudo ufw allow $PORT/udp

IP=$(curl -s ifconfig.me)
CRED=$(echo -n "$METHOD:$PASS" | base64 | tr -d '\n')
KEY="ss://$CRED@$IP:$PORT#TeamVPN"

echo "----------------------------------------"
echo "Shadowsocks Server Installed Successfully!"
echo "Server IP: $IP"
echo "Port: $PORT"
echo "Password: $PASSWORD"
echo "Method: $METHOD"
echo "----------------------------------------"
echo "ACCESS KEY (Copy this to your client):"
echo "$KEY"
echo "----------------------------------------"
echo "Key also saved to: /root/vpn-access-key.txt"
echo "$KEY" > /root/vpn-access-key.txt
echo "Add this server to your TeamVPN Admin Panel."`;

  // Form states
  const [newServer, setNewServer] = useState({ name: '', ip: '', port: 8388, password: '', method: 'chacha20-ietf-poly1305' });
  const [newKey, setNewKey] = useState({ server_id: '', name: '' });

  useEffect(() => {
    fetchData();
    if (activeTab === 'cloud') fetchDroplets();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [serversRes, keysRes] = await Promise.all([
        fetch('/api/servers'),
        fetch('/api/keys')
      ]);
      const serversData = await serversRes.json();
      const keysData = await keysRes.json();
      
      // Initialize status as checking
      const serversWithStatus = serversData.map((s: any) => ({ ...s, status: 'checking' }));
      setServers(serversWithStatus);
      setKeys(keysData);

      // Check status for each server
      serversWithStatus.forEach((s: any) => checkServerStatus(s.id));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkServerStatus = async (id: number) => {
    try {
      const res = await fetch(`/api/servers/${id}/status`);
      const data = await res.json();
      setServers(prev => prev.map(s => s.id === id ? { ...s, status: data.status } : s));
    } catch (error) {
      setServers(prev => prev.map(s => s.id === id ? { ...s, status: 'offline' } : s));
    }
  };

  const fetchDroplets = async () => {
    try {
      const res = await fetch('/api/digitalocean/droplets');
      const data = await res.json();
      if (data.droplets) setDroplets(data.droplets);
    } catch (error) {
      console.error('Error fetching droplets:', error);
    }
  };

  const addServer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newServer)
      });
      setNewServer({ name: '', ip: '', port: 8388, password: '', method: 'chacha20-ietf-poly1305' });
      fetchData();
    } catch (error) {
      console.error('Error adding server:', error);
    }
  };

  const deleteServer = async (id: number) => {
    if (!confirm('Are you sure you want to delete this server? All associated keys will be removed.')) return;
    try {
      await fetch(`/api/servers/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Error deleting server:', error);
    }
  };

  const generateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKey)
      });
      setNewKey({ server_id: '', name: '' });
      fetchData();
    } catch (error) {
      console.error('Error generating key:', error);
    }
  };

  const revokeKey = async (id: number) => {
    if (!confirm('Are you sure you want to revoke this access key?')) return;
    try {
      await fetch(`/api/keys/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Error revoking key:', error);
    }
  };

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-[#E5E7EB] p-6 z-10">
        <div className="flex items-center gap-3 mb-10">
          <div className="p-2 bg-[#0078D4] rounded-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">TeamVPN</h1>
        </div>

        <nav className="space-y-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-[#F0F7FF] text-[#0078D4] font-semibold' : 'text-[#6B7280] hover:bg-[#F9FAFB]'}`}
          >
            <Activity className="w-5 h-5" />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('servers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'servers' ? 'bg-[#F0F7FF] text-[#0078D4] font-semibold' : 'text-[#6B7280] hover:bg-[#F9FAFB]'}`}
          >
            <Server className="w-5 h-5" />
            VPN Servers
          </button>
          <button 
            onClick={() => setActiveTab('keys')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'keys' ? 'bg-[#F0F7FF] text-[#0078D4] font-semibold' : 'text-[#6B7280] hover:bg-[#F9FAFB]'}`}
          >
            <Key className="w-5 h-5" />
            Access Keys
          </button>
          <button 
            onClick={() => setActiveTab('setup')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'setup' ? 'bg-[#F0F7FF] text-[#0078D4] font-semibold' : 'text-[#6B7280] hover:bg-[#F9FAFB]'}`}
          >
            <Terminal className="w-5 h-5" />
            Setup Guide
          </button>
          <button 
            onClick={() => setActiveTab('cloud')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'cloud' ? 'bg-[#F0F7FF] text-[#0078D4] font-semibold' : 'text-[#6B7280] hover:bg-[#F9FAFB]'}`}
          >
            <Globe className="w-5 h-5" />
            Cloud Integration
          </button>
        </nav>

        <div className="absolute bottom-8 left-6 right-6">
          <div className="p-4 bg-[#F3F4F6] rounded-2xl">
            <p className="text-xs font-medium text-[#6B7280] mb-2 uppercase tracking-wider">System Status</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-[#111827]">API Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="ml-64 p-10 max-w-7xl">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold text-[#111827]">Overview</h2>
                  <p className="text-[#6B7280] mt-1">Real-time statistics for your team VPN.</p>
                </div>
                <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E7EB] rounded-xl text-sm font-medium hover:bg-[#F9FAFB] transition-colors">
                    <Download className="w-4 h-4" />
                    Export Stats
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-[#F0F7FF] rounded-2xl">
                      <Server className="w-6 h-6 text-[#0078D4]" />
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Active</span>
                  </div>
                  <p className="text-sm font-medium text-[#6B7280]">Total Servers</p>
                  <p className="text-4xl font-bold text-[#111827] mt-1">{servers.length}</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-violet-50 rounded-2xl">
                      <Key className="w-6 h-6 text-violet-600" />
                    </div>
                    <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded-lg">Active</span>
                  </div>
                  <p className="text-sm font-medium text-[#6B7280]">Access Keys</p>
                  <p className="text-4xl font-bold text-[#111827] mt-1">{keys.length}</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-emerald-50 rounded-2xl">
                      <Globe className="w-6 h-6 text-emerald-600" />
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Live</span>
                  </div>
                  <p className="text-sm font-medium text-[#6B7280]">Total Traffic</p>
                  <p className="text-4xl font-bold text-[#111827] mt-1">1.2 TB</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                <div className="p-6 border-bottom border-[#E5E7EB] flex justify-between items-center">
                  <h3 className="text-lg font-bold text-[#111827]">Recent Activity</h3>
                  <button className="text-sm font-semibold text-[#0078D4] hover:underline">View All</button>
                </div>
                <div className="divide-y divide-[#E5E7EB]">
                  {keys.slice(0, 5).map(key => (
                    <div key={key.id} className="p-6 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#F3F4F6] rounded-full flex items-center justify-center">
                          <Key className="w-5 h-5 text-[#6B7280]" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#111827]">{key.name}</p>
                          <p className="text-xs text-[#6B7280]">Connected to {key.server_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-[#111827]">2.4 GB</p>
                        <p className="text-xs text-[#6B7280]">Last 24h</p>
                      </div>
                    </div>
                  ))}
                  {keys.length === 0 && (
                    <div className="p-10 text-center text-[#6B7280]">
                      No activity yet. Generate a key to get started.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'servers' && (
            <motion.div 
              key="servers"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold text-[#111827]">VPN Servers</h2>
                  <p className="text-[#6B7280] mt-1">Manage your Shadowsocks server fleet.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                  <div className="bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-sm sticky top-10">
                    <h3 className="text-lg font-bold text-[#111827] mb-6 flex items-center gap-2">
                      <Plus className="w-5 h-5 text-[#0078D4]" />
                      Add New Server
                    </h3>
                    <form onSubmit={addServer} className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-1 block">Server Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Tokyo Node 1"
                          className="w-full px-4 py-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0078D4]/20 focus:border-[#0078D4] transition-all"
                          value={newServer.name}
                          onChange={e => setNewServer({...newServer, name: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-1 block">IP Address</label>
                        <input 
                          type="text" 
                          placeholder="123.45.67.89"
                          className="w-full px-4 py-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0078D4]/20 focus:border-[#0078D4] transition-all"
                          value={newServer.ip}
                          onChange={e => setNewServer({...newServer, ip: e.target.value})}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-1 block">Port</label>
                          <input 
                            type="number" 
                            className="w-full px-4 py-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0078D4]/20 focus:border-[#0078D4] transition-all"
                            value={newServer.port}
                            onChange={e => setNewServer({...newServer, port: parseInt(e.target.value)})}
                            required
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-1 block">Method</label>
                          <select 
                            className="w-full px-4 py-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0078D4]/20 focus:border-[#0078D4] transition-all"
                            value={newServer.method}
                            onChange={e => setNewServer({...newServer, method: e.target.value})}
                          >
                            <option value="chacha20-ietf-poly1305">Chacha20-Poly1305</option>
                            <option value="aes-256-gcm">AES-256-GCM</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-1 block">Password</label>
                        <input 
                          type="password" 
                          placeholder="••••••••"
                          className="w-full px-4 py-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0078D4]/20 focus:border-[#0078D4] transition-all"
                          value={newServer.password}
                          onChange={e => setNewServer({...newServer, password: e.target.value})}
                          required
                        />
                      </div>
                      <button 
                        type="submit"
                        className="w-full py-4 bg-[#0078D4] text-white font-bold rounded-xl hover:bg-[#106EBE] transition-colors shadow-lg shadow-[#0078D4]/20"
                      >
                        Add Server
                      </button>
                    </form>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  {servers.map(server => (
                    <div key={server.id} className="bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-sm flex items-center justify-between group hover:border-[#0078D4]/30 transition-all">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-[#F0F7FF] rounded-2xl flex items-center justify-center relative">
                          <Server className="w-7 h-7 text-[#0078D4]" />
                          <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                            server.status === 'online' ? 'bg-emerald-500' : 
                            server.status === 'offline' ? 'bg-red-500' : 'bg-amber-400 animate-pulse'
                          }`} />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-[#111827] flex items-center gap-2">
                            {server.name}
                            <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full ${
                              server.status === 'online' ? 'bg-emerald-50 text-emerald-600' : 
                              server.status === 'offline' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                              {server.status || 'checking'}
                            </span>
                          </h4>
                          <p className="text-sm font-medium text-[#6B7280]">{server.ip}:{server.port}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Method</p>
                          <p className="text-sm font-semibold text-[#111827]">{server.method}</p>
                        </div>
                        <div className="w-px h-10 bg-[#E5E7EB]" />
                        <button 
                          onClick={() => deleteServer(server.id)}
                          className="p-2 text-[#6B7280] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {servers.length === 0 && (
                    <div className="bg-white p-20 rounded-3xl border border-dashed border-[#E5E7EB] text-center">
                      <Server className="w-12 h-12 text-[#D1D5DB] mx-auto mb-4" />
                      <p className="text-[#6B7280] font-medium">No servers added yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'keys' && (
            <motion.div 
              key="keys"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold text-[#111827]">Access Keys</h2>
                  <p className="text-[#6B7280] mt-1">Generate and manage unique keys for your team members.</p>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-[#E5E7EB] shadow-sm">
                <h3 className="text-lg font-bold text-[#111827] mb-6 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#0078D4]" />
                  Generate New Key
                </h3>
                <form onSubmit={generateKey} className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-1 block">User Name / Device</label>
                    <input 
                      type="text" 
                      placeholder="e.g. John's Laptop"
                      className="w-full px-4 py-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0078D4]/20 focus:border-[#0078D4] transition-all"
                      value={newKey.name}
                      onChange={e => setNewKey({...newKey, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-1 block">Target Server</label>
                    <select 
                      className="w-full px-4 py-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0078D4]/20 focus:border-[#0078D4] transition-all"
                      value={newKey.server_id}
                      onChange={e => setNewKey({...newKey, server_id: e.target.value})}
                      required
                    >
                      <option value="">Select a server...</option>
                      {servers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.ip})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button 
                      type="submit"
                      className="px-8 py-3 bg-[#0078D4] text-white font-bold rounded-xl hover:bg-[#106EBE] transition-colors shadow-lg shadow-[#0078D4]/20 whitespace-nowrap"
                    >
                      Generate Key
                    </button>
                  </div>
                </form>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {keys.map(key => (
                  <div key={key.id} className="bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-sm flex flex-col justify-between group hover:border-[#0078D4]/30 transition-all">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center">
                          <Key className="w-6 h-6 text-violet-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-[#111827]">{key.name}</h4>
                          <p className="text-xs font-medium text-[#6B7280]">Server: {key.server_name}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => revokeKey(key.id)}
                        className="p-2 text-[#6B7280] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB] relative group/key">
                        <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-1">Access Key URI</p>
                        <p className="text-xs font-mono text-[#111827] break-all line-clamp-2 pr-8">{key.access_key}</p>
                        <button 
                          onClick={() => copyToClipboard(key.access_key, key.id)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white border border-[#E5E7EB] rounded-lg shadow-sm hover:bg-[#F9FAFB] transition-all"
                        >
                          {copiedId === key.id ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-[#6B7280]" />}
                        </button>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-medium text-[#9CA3AF]">
                        <span>Created: {new Date(key.created_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {key.server_ip}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {keys.length === 0 && (
                  <div className="md:col-span-2 bg-white p-20 rounded-3xl border border-dashed border-[#E5E7EB] text-center">
                    <Key className="w-12 h-12 text-[#D1D5DB] mx-auto mb-4" />
                    <p className="text-[#6B7280] font-medium">No access keys generated yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'cloud' && (
            <motion.div 
              key="cloud"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-[#111827] tracking-tight">Cloud Integration</h2>
                  <p className="text-[#6B7280] font-medium mt-1">Manage your DigitalOcean infrastructure</p>
                </div>
                <button 
                  onClick={fetchDroplets}
                  className="flex items-center gap-2 px-6 py-3 bg-white border border-[#E5E7EB] text-[#111827] font-bold rounded-2xl hover:bg-[#F9FAFB] transition-all shadow-sm"
                >
                  <Activity className="w-4 h-4" />
                  Refresh Droplets
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  {droplets.length > 0 ? (
                    droplets.map(droplet => (
                      <div key={droplet.id} className="bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-sm flex items-center justify-between group hover:border-[#0078D4]/30 transition-all">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-[#0080FF]/10 rounded-2xl flex items-center justify-center">
                            <Globe className="w-7 h-7 text-[#0080FF]" />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-[#111827]">{droplet.name}</h4>
                            <p className="text-sm font-medium text-[#6B7280]">{droplet.networks.v4[0]?.ip_address} • {droplet.region.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Status</p>
                            <p className={`text-sm font-semibold ${droplet.status === 'active' ? 'text-emerald-600' : 'text-amber-600'}`}>{droplet.status}</p>
                          </div>
                          <div className="w-px h-10 bg-[#E5E7EB]" />
                          <button 
                            onClick={() => {
                              setNewServer({
                                ...newServer,
                                name: droplet.name,
                                ip: droplet.networks.v4[0]?.ip_address || ''
                              });
                              setActiveTab('servers');
                            }}
                            className="px-4 py-2 bg-[#F0F7FF] text-[#0078D4] text-xs font-bold rounded-xl hover:bg-[#E0EFFF] transition-all"
                          >
                            Import to VPN
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white p-20 rounded-3xl border border-dashed border-[#E5E7EB] text-center">
                      <Globe className="w-12 h-12 text-[#D1D5DB] mx-auto mb-4" />
                      <p className="text-[#6B7280] font-medium">No droplets found or Token not configured.</p>
                      <p className="text-xs text-[#9CA3AF] mt-2">Set DIGITALOCEAN_TOKEN in your environment variables.</p>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="bg-[#111827] p-8 rounded-3xl text-white shadow-xl shadow-black/10">
                    <h3 className="text-xl font-bold mb-4">Quick Deploy</h3>
                    <p className="text-white/60 text-sm leading-relaxed mb-6">
                      Want to create a new VPN server? Use the DigitalOcean dashboard to create a droplet and paste our script in the <strong>User Data</strong> field.
                    </p>
                    <a 
                      href="https://cloud.digitalocean.com/droplets/new" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-4 bg-white text-[#111827] font-bold rounded-xl hover:bg-white/90 transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open DigitalOcean
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'setup' && (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-3xl font-bold text-[#111827]">Setup Guide</h2>
                <p className="text-[#6B7280] mt-1">Follow these steps to deploy your team VPN infrastructure.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-white p-8 rounded-3xl border border-[#E5E7EB] shadow-sm">
                    <div className="w-10 h-10 bg-[#0078D4] text-white rounded-full flex items-center justify-center font-bold mb-6">1</div>
                    <h3 className="text-xl font-bold text-[#111827] mb-4">Deploy VPN Server</h3>
                    <p className="text-[#6B7280] text-sm leading-relaxed mb-6">
                      Create an Ubuntu 22.04 Droplet on DigitalOcean. SSH into your server and run the following command:
                    </p>
                    <div className="p-4 bg-[#1A1A1A] rounded-2xl relative group mb-4">
                      <code className="text-xs text-emerald-400 font-mono break-all">
                        curl -s {window.location.origin}/install-server.sh | bash
                      </code>
                      <button 
                        onClick={() => copyToClipboard(`curl -s ${window.location.origin}/install-server.sh | bash`, 999)}
                        className="absolute right-3 top-3 p-2 bg-white/10 border border-white/10 rounded-lg hover:bg-white/20 transition-all"
                      >
                        {copiedId === 999 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white/60" />}
                      </button>
                    </div>

                    <div className="mt-4">
                      <button 
                        onClick={() => setShowManual(!showManual)}
                        className="text-xs font-semibold text-[#0078D4] hover:underline flex items-center gap-1"
                      >
                        {showManual ? 'Hide Manual Method' : 'Curl failed? Try Manual Method'}
                      </button>
                      
                      {showManual && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-4 space-y-3"
                        >
                          <p className="text-xs text-[#6B7280]">1. Create a new file on your server:</p>
                          <div className="p-3 bg-[#F3F4F6] rounded-xl font-mono text-[10px]">
                            nano install.sh
                          </div>
                          <p className="text-xs text-[#6B7280]">2. Paste the following script content:</p>
                          <div className="p-3 bg-[#1A1A1A] rounded-xl relative">
                            <pre className="text-[10px] text-emerald-400 font-mono overflow-x-auto max-h-40">
                              {installScript}
                            </pre>
                            <button 
                              onClick={() => copyToClipboard(installScript, 888)}
                              className="absolute right-2 top-2 p-1 bg-white/10 rounded hover:bg-white/20"
                            >
                              {copiedId === 888 ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-white/60" />}
                            </button>
                          </div>
                          <p className="text-xs text-[#6B7280]">3. Save, exit, and run:</p>
                          <div className="p-3 bg-[#F3F4F6] rounded-xl font-mono text-[10px]">
                            bash install.sh
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-[#E5E7EB] shadow-sm">
                    <div className="w-10 h-10 bg-[#0078D4] text-white rounded-full flex items-center justify-center font-bold mb-6">2</div>
                    <h3 className="text-xl font-bold text-[#111827] mb-4">Add Server to Admin</h3>
                    <p className="text-[#6B7280] text-sm leading-relaxed">
                      After installation, the script will output the Server IP, Port, and Password. Go to the <strong>VPN Servers</strong> tab and add these details to the dashboard.
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white p-8 rounded-3xl border border-[#E5E7EB] shadow-sm">
                    <div className="w-10 h-10 bg-[#0078D4] text-white rounded-full flex items-center justify-center font-bold mb-6">3</div>
                    <h3 className="text-xl font-bold text-[#111827] mb-4">Distribute Client</h3>
                    <p className="text-[#6B7280] text-sm leading-relaxed mb-6">
                      For the best experience, we recommend using the <strong>Official Outline Client</strong>. It is a simple EXE that works perfectly with our keys.
                    </p>
                    <div className="space-y-3">
                      <a 
                        href="https://getoutline.org/get-started/#step-3" 
                        target="_blank"
                        className="w-full flex items-center justify-center gap-2 py-4 bg-[#0078D4] text-white font-bold rounded-xl hover:bg-[#106EBE] transition-colors shadow-lg shadow-[#0078D4]/20"
                      >
                        <Download className="w-5 h-5" />
                        Download Outline Client (EXE)
                      </a>
                      
                      <div className="pt-4 border-t border-[#E5E7EB]">
                        <button 
                          onClick={() => setShowPython(!showPython)}
                          className="text-xs font-semibold text-[#6B7280] hover:underline"
                        >
                          {showPython ? 'Hide Python Client' : 'Need a custom Python client?'}
                        </button>
                        
                        {showPython && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-4 space-y-4"
                          >
                            <p className="text-xs text-[#6B7280]">1. Copy this code to a file named <code>client.py</code>:</p>
                            <div className="p-3 bg-[#1A1A1A] rounded-xl relative">
                              <pre className="text-[10px] text-emerald-400 font-mono overflow-x-auto max-h-40">
                                {clientCode}
                              </pre>
                              <button 
                                onClick={() => copyToClipboard(clientCode, 777)}
                                className="absolute right-2 top-2 p-1 bg-white/10 rounded hover:bg-white/20"
                              >
                                {copiedId === 777 ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-white/60" />}
                              </button>
                            </div>
                            <p className="text-xs text-[#6B7280]">2. Install requirements:</p>
                            <div className="p-3 bg-[#F3F4F6] rounded-xl font-mono text-[10px]">
                              pip install PyQt6 requests
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-[#E5E7EB] shadow-sm">
                    <div className="w-10 h-10 bg-[#0078D4] text-white rounded-full flex items-center justify-center font-bold mb-6">4</div>
                    <h3 className="text-xl font-bold text-[#111827] mb-4">Connect</h3>
                    <p className="text-[#6B7280] text-sm leading-relaxed">
                      Users simply open the client, select their assigned key from the list, and click <strong>CONNECT</strong>. The client will automatically configure the system proxy.
                    </p>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-[#E5E7EB] shadow-sm">
                    <div className="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold mb-6">!</div>
                    <h3 className="text-xl font-bold text-[#111827] mb-4">Stable Maintenance Method</h3>
                    <p className="text-[#6B7280] text-sm leading-relaxed mb-4">
                      If you haven't re-run the installation script, the file below might not exist yet. Use the <strong>SSH terminal</strong> on your server to run these:
                    </p>
                    
                    <div className="space-y-6">
                      <div>
                        <p className="text-xs font-bold text-[#111827] mb-2 uppercase tracking-wider">Option A: Quick Retrieval (If script was re-run)</p>
                        <div className="p-4 bg-[#1A1A1A] rounded-2xl relative group">
                          <code className="text-xs text-emerald-400 font-mono break-all leading-relaxed">
                            sudo cat /root/vpn-access-key.txt 2&gt;/dev/null || echo "File not found. Use Option B below."
                          </code>
                          <button 
                            onClick={() => copyToClipboard(`sudo cat /root/vpn-access-key.txt`, 555)}
                            className="absolute right-3 top-3 p-2 bg-white/10 border border-white/10 rounded-lg hover:bg-white/20 transition-all"
                          >
                            {copiedId === 555 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white/60" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-[#111827] mb-2 uppercase tracking-wider">Option B: Generate from Config (Most Reliable)</p>
                        <div className="p-4 bg-[#1A1A1A] rounded-2xl relative group">
                          <code className="text-[10px] text-emerald-400 font-mono break-all leading-relaxed">
                            {`METHOD=$(sudo grep '"method"' /etc/shadowsocks-libev/config.json | cut -d'"' -f4)\nPASS=$(sudo grep '"password"' /etc/shadowsocks-libev/config.json | cut -d'"' -f4)\nPORT=$(sudo grep '"server_port"' /etc/shadowsocks-libev/config.json | cut -d':' -f2 | tr -d ' ,')\nIP=$(curl -s ifconfig.me)\nCRED=$(echo -n "$METHOD:$PASS" | base64 | tr -d '\\n')\necho "ss://$CRED@$IP:$PORT#TeamVPN"`}
                          </code>
                          <button 
                            onClick={() => copyToClipboard(`METHOD=$(sudo grep '"method"' /etc/shadowsocks-libev/config.json | cut -d'"' -f4)\nPASS=$(sudo grep '"password"' /etc/shadowsocks-libev/config.json | cut -d'"' -f4)\nPORT=$(sudo grep '"server_port"' /etc/shadowsocks-libev/config.json | cut -d':' -f2 | tr -d ' ,')\nIP=$(curl -s ifconfig.me)\nCRED=$(echo -n "$METHOD:$PASS" | base64 | tr -d '\\n')\necho "ss://$CRED@$IP:$PORT#TeamVPN"`, 666)}
                            className="absolute right-3 top-3 p-2 bg-white/10 border border-white/10 rounded-lg hover:bg-white/20 transition-all"
                          >
                            {copiedId === 666 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white/60" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-[#E5E7EB] shadow-sm">
                    <div className="w-10 h-10 bg-[#0078D4] text-white rounded-full flex items-center justify-center font-bold mb-6">3</div>
                    <h3 className="text-xl font-bold text-[#111827] mb-4">Deploy to DigitalOcean</h3>
                    <p className="text-[#6B7280] text-sm leading-relaxed mb-4">
                      To move this dashboard from your laptop to a live web server on DigitalOcean, follow these steps on your droplet:
                    </p>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-bold text-[#111827] mb-2 uppercase tracking-wider">1. Install Node.js & PM2</p>
                        <div className="p-4 bg-[#1A1A1A] rounded-2xl relative group">
                          <code className="text-[10px] text-emerald-400 font-mono break-all leading-relaxed">
                            {`curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -\nsudo apt-get install -y nodejs\nsudo npm install -g pm2`}
                          </code>
                          <button 
                            onClick={() => copyToClipboard(`curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -\nsudo apt-get install -y nodejs\nsudo npm install -g pm2`, 777)}
                            className="absolute right-3 top-3 p-2 bg-white/10 border border-white/10 rounded-lg hover:bg-white/20 transition-all"
                          >
                            {copiedId === 777 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white/60" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-[#111827] mb-2 uppercase tracking-wider">2. Clone & Start App</p>
                        <div className="p-4 bg-[#1A1A1A] rounded-2xl relative group">
                          <code className="text-[10px] text-emerald-400 font-mono break-all leading-relaxed">
                            {`git clone https://github.com/waiyankyawlin-oss/VPN.git\ncd VPN\nnpm install\nnpm run build\npm2 start server.ts --name "vpn-dashboard" --interpreter tsx\npm2 save\npm2 startup`}
                          </code>
                          <button 
                            onClick={() => copyToClipboard(`git clone https://github.com/waiyankyawlin-oss/VPN.git\ncd VPN\nnpm install\nnpm run build\npm2 start server.ts --name "vpn-dashboard" --interpreter tsx\npm2 save\npm2 startup`, 888)}
                            className="absolute right-3 top-3 p-2 bg-white/10 border border-white/10 rounded-lg hover:bg-white/20 transition-all"
                          >
                            {copiedId === 888 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white/60" />}
                          </button>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                        <p className="text-xs text-amber-800 leading-relaxed">
                          <strong>Note:</strong> After running these, your dashboard will be live at <code>http://your-droplet-ip:3000</code>. Remember to allow port 3000 in your DigitalOcean firewall (UFW).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
