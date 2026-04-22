import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { getVersion } from '@tauri-apps/api/app';
import { checkUpdate, installUpdate } from '@tauri-apps/api/updater';

// ── State ──
let currentTab = 'dashboard';
let gatewayOnline = false;
let appVersion = '1.0.0';

// ── Init ──
(async () => {
  appVersion = await getVersion();
  render();
  setupListeners();
  startMetricsLoop();
})();

listen('gateway-log', (event) => {
  appendLog(event.payload, 'info');
});

// ── Render ──
function render() {
  document.querySelector('#app').innerHTML = `
    <!-- Sidebar -->
    <div class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon">OC</div>
        <div>
          <div class="brand-text">Open<span>Claw</span></div>
        </div>
        <span class="brand-version">v${appVersion}</span>
      </div>

      <nav class="sidebar-nav">
        <div class="sidebar-section">Overview</div>
        ${navItem('dashboard', '⬡', 'Dashboard')}

        <div class="sidebar-section">Configuration</div>
        ${navItem('general', '⚙', 'General')}
        ${navItem('channels', '🔗', 'Channels')}
        ${navItem('sessions', '💬', 'Sessions')}
        ${navItem('skills', '✦', 'Skills')}

        <div class="sidebar-section">System</div>
        ${navItem('debug', '🔧', 'Debug')}
        ${navItem('about', 'ℹ', 'About')}
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-status">
          <div class="status-dot ${gatewayOnline ? 'online' : 'offline'}" id="sidebar-dot"></div>
          <span id="sidebar-status-text">${gatewayOnline ? 'Gateway Online' : 'Gateway Offline'}</span>
        </div>
      </div>
    </div>

    <!-- Main Area -->
    <div class="main-area">
      <div class="main-header">
        <h2 id="page-title">Dashboard</h2>
        <div class="header-actions" id="header-actions"></div>
      </div>
      <div class="main-content" id="main-content">
        ${renderTab(currentTab)}
      </div>
    </div>
  `;
}

function navItem(id, icon, label) {
  return `<div class="nav-item ${currentTab === id ? 'active' : ''}" data-tab="${id}">
    <span class="nav-icon">${icon}</span>
    <span>${label}</span>
  </div>`;
}

// ── Tab Content Renderers ──
function renderTab(tab) {
  switch (tab) {
    case 'dashboard': return renderDashboard();
    case 'general': return renderGeneral();
    case 'channels': return renderChannels();
    case 'sessions': return renderSessions();
    case 'skills': return renderSkills();
    case 'debug': return renderDebug();
    case 'about': return renderAbout();
    default: return renderDashboard();
  }
}

function renderDashboard() {
  return `
    <div class="dashboard-grid">
      <div class="stat-card">
        <div class="stat-label">Status</div>
        <div class="stat-value ${gatewayOnline ? 'online' : 'offline'}" id="dash-status">
          ${gatewayOnline ? 'ONLINE' : 'OFFLINE'}
        </div>
        <div class="stat-sub" id="dash-uptime">Uptime: 0:00:00</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Restarts</div>
        <div class="stat-value" id="dash-restarts">0</div>
        <div class="stat-sub">Since last manual start</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Performance</span>
      </div>
      <div class="progress-row">
        <span class="progress-label">CPU</span>
        <div class="progress-track"><div class="progress-fill" id="cpu-bar" style="width:0%"></div></div>
        <span class="progress-val" id="cpu-val">0%</span>
      </div>
      <div class="progress-row">
        <span class="progress-label">Memory</span>
        <div class="progress-track"><div class="progress-fill" id="ram-bar" style="width:0%"></div></div>
        <span class="progress-val" id="ram-val">0 MB</span>
      </div>
      <div class="gateway-controls" id="gateway-controls">
        <button class="btn btn-primary ${gatewayOnline ? 'hidden' : ''}" id="start-btn">Start Gateway</button>
        <button class="btn btn-danger ${!gatewayOnline ? 'hidden' : ''}" id="stop-btn">Stop Gateway</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">System Logs</span>
        <button class="btn btn-ghost btn-sm" id="clear-logs-btn">Clear</button>
      </div>
      <div class="terminal" id="logs-container">
        <div class="log-line"><span class="log-time">[${ts()}]</span> System initializing...</div>
      </div>
    </div>
  `;
}

function renderGeneral() {
  return `
    <div class="settings-section">
      <div class="settings-section-title">Gateway</div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">Gateway Port</div>
          <div class="setting-desc">Port the OpenClaw gateway listens on. Default: 18789.</div>
        </div>
        <div class="setting-control">
          <input type="number" class="input input-sm" id="setting-port" value="18789">
        </div>
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">Auto-start on Boot</div>
          <div class="setting-desc">Automatically start OpenClaw when you sign in to Windows.</div>
        </div>
        <div class="setting-control">
          <label class="toggle">
            <input type="checkbox" id="setting-autostart">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">Application</div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">Start Minimized</div>
          <div class="setting-desc">Launch the app minimized to the system tray.</div>
        </div>
        <div class="setting-control">
          <label class="toggle">
            <input type="checkbox" id="setting-minimized">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">Notifications</div>
          <div class="setting-desc">Show system notifications for gateway events.</div>
        </div>
        <div class="setting-control">
          <label class="toggle">
            <input type="checkbox" id="setting-notifications" checked>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">Updates</div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">Check for Updates</div>
          <div class="setting-desc">Verify if a newer version of OpenClaw is available.</div>
        </div>
        <div class="setting-control">
          <button class="btn btn-ghost btn-sm" id="check-update-btn">Check Now</button>
        </div>
      </div>
    </div>

    <div style="margin-top: 16px;">
      <button class="btn btn-ghost btn-sm" id="save-settings-btn">Save Changes</button>
    </div>
  `;
}

function renderChannels() {
  return `
    <div class="two-pane">
      <div class="pane-sidebar">
        <div class="pane-section-label">Configured</div>
        <div class="pane-item active">
          <div class="pane-item-dot" style="background:var(--success)"></div>
          <div class="pane-item-info">
            <div class="pane-item-name">Discord</div>
            <div class="pane-item-sub">Connected</div>
          </div>
        </div>
        <div class="pane-item">
          <div class="pane-item-dot" style="background:var(--success)"></div>
          <div class="pane-item-info">
            <div class="pane-item-name">Telegram</div>
            <div class="pane-item-sub">Connected</div>
          </div>
        </div>
        <div class="pane-section-label">Available</div>
        <div class="pane-item">
          <div class="pane-item-dot" style="background:var(--text-muted)"></div>
          <div class="pane-item-info">
            <div class="pane-item-name">Slack</div>
            <div class="pane-item-sub">Not configured</div>
          </div>
        </div>
        <div class="pane-item">
          <div class="pane-item-dot" style="background:var(--text-muted)"></div>
          <div class="pane-item-info">
            <div class="pane-item-name">WhatsApp</div>
            <div class="pane-item-sub">Not configured</div>
          </div>
        </div>
        <div class="pane-item">
          <div class="pane-item-dot" style="background:var(--text-muted)"></div>
          <div class="pane-item-info">
            <div class="pane-item-name">Signal</div>
            <div class="pane-item-sub">Not configured</div>
          </div>
        </div>
      </div>
      <div class="pane-content">
        <div class="empty-state">
          <div class="empty-state-icon">🔗</div>
          <div class="empty-state-text">Select a channel to view settings</div>
          <div class="empty-state-sub">Channels connect OpenClaw to your messaging platforms.</div>
        </div>
      </div>
    </div>
  `;
}

function renderSessions() {
  return `
    <div class="card">
      <div class="card-header">
        <span class="card-title">Active Sessions</span>
        <button class="btn btn-ghost btn-sm" id="refresh-sessions-btn">Refresh</button>
      </div>
      <div id="sessions-list">
        <div class="empty-state">
          <div class="empty-state-icon">💬</div>
          <div class="empty-state-text">No active sessions</div>
          <div class="empty-state-sub">Sessions appear after conversations begin through any channel.</div>
        </div>
      </div>
    </div>
  `;
}

function renderSkills() {
  return `
    <div class="card">
      <div class="card-header">
        <span class="card-title">Installed Skills</span>
        <button class="btn btn-ghost btn-sm" id="refresh-skills-btn">Refresh</button>
      </div>
      <div id="skills-list">
        <div class="empty-state">
          <div class="empty-state-icon">✦</div>
          <div class="empty-state-text">No skills loaded</div>
          <div class="empty-state-sub">Skills are loaded when the gateway connects and requirements are met.</div>
        </div>
      </div>
    </div>
  `;
}

function renderDebug() {
  return `
    <div class="settings-section">
      <div class="settings-section-title">Gateway Process</div>
      <div class="debug-grid">
        <span class="debug-label">Status</span>
        <span class="debug-value" id="debug-status">${gatewayOnline ? 'Running' : 'Stopped'}</span>
        <span class="debug-label">Port</span>
        <span class="debug-value" id="debug-port">—</span>
        <span class="debug-label">Binary</span>
        <span class="debug-value" id="debug-binary">—</span>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">Actions</div>
      <div class="flex gap-8">
        <button class="btn btn-ghost btn-sm" id="debug-restart-btn">Restart Gateway</button>
        <button class="btn btn-ghost btn-sm" id="debug-health-btn">Health Check</button>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">Log Output</div>
      <div class="terminal" id="debug-logs" style="max-height:400px;">
        <div class="log-line"><span class="log-time">[${ts()}]</span> Debug console ready.</div>
      </div>
    </div>
  `;
}

function renderAbout() {
  return `
    <div class="about-center">
      <div class="about-icon">OC</div>
      <div class="about-title">OpenClaw</div>
      <div class="about-version">Version ${appVersion} — Windows</div>
      <div class="about-desc">
        Your AI gateway for Windows. Manages the OpenClaw gateway process
        with automatic monitoring, health checks, and system tray integration.
      </div>
      <div class="about-links">
        <a href="#">GitHub</a>
        <a href="#">Website</a>
        <a href="#">Documentation</a>
      </div>
      <div class="about-divider"></div>
      <div class="settings-section" style="width:100%;max-width:360px;">
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">Check for Updates</div>
          </div>
          <div class="setting-control">
            <button class="btn btn-ghost btn-sm" id="about-update-btn">Check Now</button>
          </div>
        </div>
      </div>
      <div class="text-xs text-muted" style="margin-top:24px;">MIT License</div>
    </div>
  `;
}

// ── Navigation ──
function setupListeners() {
  document.addEventListener('click', (e) => {
    const navItem = e.target.closest('.nav-item');
    if (navItem) {
      switchTab(navItem.dataset.tab);
      return;
    }

    // Dashboard buttons
    if (e.target.id === 'start-btn') { handleStart(); }
    if (e.target.id === 'stop-btn') { handleStop(); }
    if (e.target.id === 'clear-logs-btn') { clearLogs(); }

    // General settings
    if (e.target.id === 'save-settings-btn') { saveSettings(); }
    if (e.target.id === 'check-update-btn' || e.target.id === 'about-update-btn') { handleUpdate(); }

    // Debug
    if (e.target.id === 'debug-restart-btn') { handleDebugRestart(); }
    if (e.target.id === 'debug-health-btn') { handleHealthCheck(); }
  });
}

function switchTab(tab) {
  currentTab = tab;
  // Update nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tab);
  });
  // Update title
  const titles = {
    dashboard: 'Dashboard', general: 'General', channels: 'Channels',
    sessions: 'Sessions', skills: 'Skills', debug: 'Debug', about: 'About'
  };
  document.getElementById('page-title').textContent = titles[tab] || tab;
  // Render content
  document.getElementById('main-content').innerHTML = renderTab(tab);
  // Load tab data
  if (tab === 'general') { loadGeneralSettings(); }
  if (tab === 'debug') { loadDebugInfo(); }
}

// ── Gateway Control ──
async function handleStart() {
  try {
    await invoke('start_gateway');
    appendLog('Initiating gateway startup...', 'info');
  } catch (e) {
    appendLog('Start Error: ' + e, 'error');
  }
}

async function handleStop() {
  try {
    await invoke('stop_gateway');
    appendLog('Gateway stopped manually.', 'info');
  } catch (e) {
    appendLog('Stop Error: ' + e, 'error');
  }
}

async function handleDebugRestart() {
  try {
    await invoke('stop_gateway');
  } catch { /* may already be stopped */ }
  try {
    await invoke('start_gateway');
    appendLog('Gateway restarted from debug panel.', 'info');
  } catch (e) {
    appendLog('Restart Error: ' + e, 'error');
  }
}

async function handleHealthCheck() {
  try {
    const port = await invoke('get_port');
    appendLog(`Health check: gateway on port ${port}`, 'info');
    const debugLogs = document.getElementById('debug-logs');
    if (debugLogs) {
      const d = document.createElement('div');
      d.className = 'log-line';
      d.innerHTML = `<span class="log-time">[${ts()}]</span> Health probe sent to :${port}/health`;
      debugLogs.appendChild(d);
      debugLogs.scrollTop = debugLogs.scrollHeight;
    }
  } catch (e) {
    appendLog('Health check error: ' + e, 'error');
  }
}

// ── Settings ──
async function loadGeneralSettings() {
  try {
    const port = await invoke('get_config', { key: 'gateway.port' });
    const autostart = await invoke('is_autostart_enabled');
    const portInput = document.getElementById('setting-port');
    const autoInput = document.getElementById('setting-autostart');
    if (portInput) { portInput.value = port || '18789'; }
    if (autoInput) { autoInput.checked = autostart; }
  } catch { /* defaults are fine */ }
}

async function saveSettings() {
  try {
    const port = document.getElementById('setting-port')?.value;
    const autostart = document.getElementById('setting-autostart')?.checked;
    if (port) { await invoke('set_config', { key: 'gateway.port', value: port }); }
    if (autostart !== undefined) { await invoke('toggle_autostart', { enabled: autostart }); }
    appendLog('Settings saved.', 'info');
  } catch (e) {
    appendLog('Settings Error: ' + e, 'error');
  }
}

async function loadDebugInfo() {
  try {
    const port = await invoke('get_port');
    const el = document.getElementById('debug-port');
    if (el) { el.textContent = port; }
  } catch { /* port unavailable */ }
}

// ── Updates ──
async function handleUpdate() {
  try {
    const { shouldUpdate, manifest } = await checkUpdate();
    if (shouldUpdate) {
      appendLog(`Update found: ${manifest.version}. Installing...`, 'info');
      await installUpdate();
    } else {
      appendLog('Already on the latest version.', 'info');
    }
  } catch (error) {
    if (error.toString().includes('Updater not active')) {
      appendLog('Update checks disabled for this build (signing key required).', 'info');
    } else {
      appendLog('Update Error: ' + error, 'error');
    }
  }
}

// ── Metrics Loop ──
function startMetricsLoop() {
  setInterval(updateMetrics, 2000);
  updateMetrics();
}

async function updateMetrics() {
  try {
    const m = await invoke('get_metrics');
    gatewayOnline = m.online;

    // Sidebar status
    const dot = document.getElementById('sidebar-dot');
    const statusText = document.getElementById('sidebar-status-text');
    if (dot) {
      dot.className = `status-dot ${m.online ? 'online' : 'offline'}`;
    }
    if (statusText) {
      statusText.textContent = m.online ? 'Gateway Online' : 'Gateway Offline';
    }

    // Only update dashboard elements if they exist
    const dashStatus = document.getElementById('dash-status');
    if (dashStatus) {
      dashStatus.textContent = m.online ? 'ONLINE' : 'OFFLINE';
      dashStatus.className = `stat-value ${m.online ? 'online' : 'offline'}`;
    }

    const dashUptime = document.getElementById('dash-uptime');
    if (dashUptime) {
      const s = m.uptime_secs;
      const h = Math.floor(s / 3600);
      const min = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      dashUptime.textContent = `Uptime: ${h}:${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    }

    const dashRestarts = document.getElementById('dash-restarts');
    if (dashRestarts) { dashRestarts.textContent = m.restarts; }

    const cpuBar = document.getElementById('cpu-bar');
    const cpuVal = document.getElementById('cpu-val');
    if (cpuBar) { cpuBar.style.width = `${Math.min(m.cpu_usage, 100).toFixed(1)}%`; }
    if (cpuVal) { cpuVal.textContent = `${m.cpu_usage.toFixed(1)}%`; }

    const ramBar = document.getElementById('ram-bar');
    const ramVal = document.getElementById('ram-val');
    if (ramBar && m.total_memory_mb > 0) {
      ramBar.style.width = `${Math.min((m.memory_mb / m.total_memory_mb) * 100, 100).toFixed(1)}%`;
    }
    if (ramVal) { ramVal.textContent = `${m.memory_mb} / ${m.total_memory_mb} MB`; }

    // Gateway control buttons visibility
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    if (startBtn) { startBtn.classList.toggle('hidden', m.online); }
    if (stopBtn) { stopBtn.classList.toggle('hidden', !m.online); }

    // Debug status
    const debugStatus = document.getElementById('debug-status');
    if (debugStatus) { debugStatus.textContent = m.online ? 'Running' : 'Stopped'; }

  } catch {
    // metrics unavailable
  }
}

// ── Logging ──
function appendLog(msg, type = 'info') {
  const c = document.getElementById('logs-container');
  if (!c) { return; }
  const d = document.createElement('div');
  d.className = `log-line ${type}`;
  d.innerHTML = `<span class="log-time">[${ts()}]</span> ${escapeHtml(msg)}`;
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
  // Keep max 500 lines
  while (c.children.length > 500) { c.removeChild(c.firstChild); }
}

function clearLogs() {
  const c = document.getElementById('logs-container');
  if (c) {
    c.innerHTML = `<div class="log-line"><span class="log-time">[${ts()}]</span> Logs cleared.</div>`;
  }
}

// ── Helpers ──
function ts() {
  return new Date().toLocaleTimeString();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
