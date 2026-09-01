// ==========================================
// CONFIGURAÇÃO CENTRAL DE ROTAS DA API
// ==========================================
const API_ROUTES = {
    health: '/api/health',
    readEmails: '/api/emails/leitura_automatica',
    processQueue: '/api/processar_fila',
    processSingle: '/api/process/single',
    previewSingle: '/api/process/preview_single',
    previewOcr: '/api/process/preview_ocr',
    pending: '/api/emails_pendentes',
    processed: '/api/emails_processados',
    extracted: '/api/emails_extraidos',
    monitorStart: '/api/monitor/start',
    monitorStop: '/api/monitor/stop',
    stats: '/api/stats',
    logs: '/api/logs',
    processManual: '/api/process/manual',
    vendors: '/api/vendors',
    deleted: '/api/emails/deleted',
    restoreEmail: '/api/emails/restore'
};

let isMonitorRunning = false;

function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobile-overlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('mobile-open');
        overlay.classList.toggle('show');
    }
}

// ==========================================
// SISTEMA DE PAGINAÇÃO GLOBAL
// ==========================================
const ITEMS_PER_PAGE = 10;
const dataStore = {
    pending: { data: [], page: 1 },
    processed: { data: [], page: 1 },
    extracted: { data: [], page: 1 },
    deleted: { data: [], page: 1 }
};

document.addEventListener("DOMContentLoaded", () => {
    // Inicializa os dados do usuário logado na UI
    initializeUser();

    // Interceptador global para redirecionar para login caso o token expire
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch(...args);
        // Evita redirecionar se estivermos na página de login
        if ((response.status === 401 || response.status === 403) && window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
        return response;
    };

    // --- Lógica de Theme Toggle ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;
    
    const isDarkMode = localStorage.getItem('themeDarkMode') === 'true';
    if (isDarkMode) {
        body.classList.add('dark-mode');
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = '<i data-lucide="sun"></i>';
        }
    } else {
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = '<i data-lucide="moon"></i>';
        }
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            const isDarkNow = body.classList.contains('dark-mode');
            localStorage.setItem('themeDarkMode', isDarkNow);
            themeToggleBtn.innerHTML = isDarkNow ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
            lucide.createIcons({ root: themeToggleBtn });
        });
    }

    // --- Lógica de Sidebar Toggle ---
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    
    if (sidebar && toggleBtn) {
        // Carrega estado inicial
        const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        if (isCollapsed) {
            sidebar.classList.add('collapsed');
            updateToggleIcon(true);
        }

        toggleBtn.addEventListener('click', () => {
            const nowCollapsed = sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebarCollapsed', nowCollapsed);
            updateToggleIcon(nowCollapsed);
        });
    }

    function updateToggleIcon(collapsed) {
        // A rotação agora é feita puramente via CSS (.sidebar.collapsed #sidebar-toggle svg)
    }

    const fileInput = document.getElementById('manualFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            processFilesForPreview();
        });
    }

    const dropZone = document.getElementById('upload-drop-zone');
    if (dropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files && files.length > 0) {
                handleManualFileDrop(files);
            }
        });
    }

    // Sincronização Dinâmica: Para e Assunto digitados vão para a Simulação
    const emailToInput = document.getElementById('email-recipient');
    const emailSubInput = document.getElementById('email-subject');

    if(emailToInput) {
        emailToInput.addEventListener('input', (e) => {
            document.getElementById('sim-to-display').innerText = e.target.value || "Contratos TI Homologação";
        });
    }

    if(emailSubInput) {
        emailSubInput.addEventListener('input', (e) => {
            const val = e.target.value || "[Sem Assunto]";
            document.getElementById('sim-subject-display').innerText = val;
        });
    }

    lucide.createIcons();
    checkMonitorStatus();
    refreshAll();
    
    // Aba removida do js
});

// Funções de Utilitários
function getMailboxQuery() {
    const switcher = document.getElementById('admin-mailbox-switcher');
    if (switcher && switcher.value) {
        return `?mailbox_filter=${encodeURIComponent(switcher.value)}`;
    }
    return '';
}

function escapeHtml(text) {
    if (!text) return "";
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatarData(dataStr) {
    if (!dataStr) return "<span style='color:var(--text2)'>-</span>";
    try {
        const dateObj = new Date(dataStr);
        if (isNaN(dateObj.getTime())) return escapeHtml(dataStr); 
        return dateObj.toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch (error) {
        return escapeHtml(dataStr);
    }
}

function getStatusBadge(status) {
    let cssClass = "status-pending";
    let icon = "clock";
    
    if (status === "Aguardando Compras") {
        cssClass = "status-waiting-compras";
        icon = "shopping-cart";
    } else if (status === "Aguardando Envio Fiscal") {
        cssClass = "status-waiting-send-fiscal";
        icon = "send";
    } else if (status === "Aguardando Fiscal") {
        cssClass = "status-waiting-fiscal";
        icon = "file-text";
    } else if (status === "Pronto para Impressão") {
        cssClass = "status-ready-print";
        icon = "printer";
    } else if (status === "Concluído") {
        cssClass = "status-concluded";
        icon = "check-circle";
    } else if (status === "Excluído") {
        cssClass = "status-deleted";
        icon = "trash-2";
    } else if (status === "Sem Nota Fiscal") {
        cssClass = "status-sem-nota";
        icon = "alert-triangle";
    } else if (status === "Cobrado") {
        cssClass = "status-cobrado";
        icon = "mail";
    } else if (status === "Resposta Recebida (Sem Anexo)") {
        cssClass = "status-resposta-sem-anexo";
        icon = "message-square";
    }
    
    return `<span class="status-badge ${cssClass}"><i data-lucide="${icon}"></i> ${escapeHtml(status)}</span>`;
}


function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    let icon = "info";
    if (type === "success") icon = "check-circle";
    if (type === "error") icon = "alert-circle";

    toast.innerHTML = `
        <i data-lucide="${icon}"></i>
        <span style="font-size: 14px; font-weight: 500;">${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    lucide.createIcons({ root: toast });

    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Tabs system removed for notas.html

function updateMonitorBtnUI() {
    const btn = document.getElementById('btn-toggle-monitor');
    const statusText = document.getElementById('monitor-status-text');
    if(btn) {
        if(isMonitorRunning) {
            btn.className = "btn btn-danger";
            btn.innerHTML = `<i data-lucide="toggle-right" class="status-pulse"></i> Parar Monitoramento`;
        } else {
            btn.className = "btn btn-secondary";
            btn.innerHTML = `<i data-lucide="toggle-left"></i> Ativar Monitoramento`;
        }
        lucide.createIcons();
    }
    if(statusText) {
        if(isMonitorRunning) {
            statusText.className = "trend-up";
            statusText.innerText = "Monitoramento Ativo";
        } else {
            statusText.className = "trend-down";
            statusText.innerText = "Monitoramento Inativo";
        }
    }
}

async function checkMonitorStatus() {
    try {
        const response = await fetch(`/api/monitor/status?t=${Date.now()}`, { cache: 'no-store' });
        if(response.ok) {
            const data = await response.json();
            isMonitorRunning = data.running;
            updateMonitorBtnUI();
        }
    } catch(e) {}
}

async function toggleMonitor() {
    const endpoint = isMonitorRunning ? API_ROUTES.monitorStop : API_ROUTES.monitorStart;
    try {
        const response = await fetch(endpoint + getMailboxQuery(), { method: 'POST' });
        const data = await response.json();
        if (data.success || response.ok) {
            isMonitorRunning = !isMonitorRunning;
            showToast(data.message || "Status do monitor alterado", "success");
            updateMonitorBtnUI();
        } else {
            showToast("Falha ao alterar estado", "error");
        }
    } catch (err) {
        showToast("Erro de conexão ao alterar monitor", "error");
    }
}

function refreshAll(isAutoRefresh = false) {
    loadPending(isAutoRefresh);
    loadProcessedEmails(isAutoRefresh);
    loadExtractedEmails(isAutoRefresh);
    updateStats();
}

function onMailboxChange() {
    dataStore.pending.page = 1;
    dataStore.processed.page = 1;
    dataStore.extracted.page = 1;
    dataStore.deleted.page = 1;
    refreshAll(false);
}

let chartProcessedInstance = null;
let chartStatusInstance = null;

async function updateStats() {
    try {
        const response = await fetch(API_ROUTES.stats + getMailboxQuery());
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('stat-processed').innerText = stats.processed_current_month !== undefined ? stats.processed_current_month : stats.processed_count;
            document.getElementById('stat-pending').innerText = stats.pending_count !== undefined ? stats.pending_count : dataStore.pending.data.length;
            document.getElementById('stat-success-rate').innerText = (stats.success_rate || "100") + "%";
            
            if (stats.process_type_breakdown) {
                document.getElementById('breakdown-auto').innerText = stats.process_type_breakdown.Automático || 0;
                document.getElementById('breakdown-manual').innerText = stats.process_type_breakdown.Manual || 0;
                document.getElementById('breakdown-massa').innerText = stats.process_type_breakdown.Massa || 0;
                document.getElementById('breakdown-unico').innerText = stats.process_type_breakdown.Único || 0;
            }
            
            if (stats.chart_processed_by_day && Object.keys(stats.chart_processed_by_day).length > 0) {
                renderProcessedChart(stats.chart_processed_by_day);
            }
            if (stats.status_breakdown && Object.keys(stats.status_breakdown).length > 0) {
                const filteredBreakdown = {};
                for (const [key, value] of Object.entries(stats.status_breakdown)) {
                    if (key !== 'Excluído' && key !== 'Excluido' && key !== 'Ignorado') {
                        filteredBreakdown[key] = value;
                    }
                }
                renderStatusChart(filteredBreakdown);
            }
            return;
        }
    } catch (err) { }
    // Removido fallback local que causava divergências (exibia todo o histórico em vez do mês atual)
}

function renderProcessedChart(dataByDay) {
    const ctx = document.getElementById('chartProcessedMonth');
    if (!ctx) return;
    
    // Preparar labels (dias do mês) e dados ordenados
    const days = Object.keys(dataByDay).map(Number).sort((a, b) => a - b);
    const labels = days.map(d => String(d).padStart(2, '0'));
    const data = days.map(d => dataByDay[String(d)]);

    if (chartProcessedInstance) {
        chartProcessedInstance.destroy();
    }

    chartProcessedInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Processados',
                data: data,
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                pointRadius: 3,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: true, ticks: { font: { size: 9 } }, grid: { display: false } },
                y: { display: false, beginAtZero: true }
            }
        }
    });
}

function renderStatusChart(statusData) {
    const ctx = document.getElementById('chartStatusBreakdown');
    if (!ctx) return;

    const labels = Object.keys(statusData);
    const data = Object.values(statusData);
    
    const colors = labels.map(status => {
        if (status === 'Pendente') return '#9CA3AF'; // gray
        if (status === 'Aguardando Compras') return '#F59E0B'; // amber
        if (status === 'Aguardando Fiscal' || status === 'Aguardando Envio Fiscal') return '#3B82F6'; // blue
        if (status === 'Pronto para Impressão') return '#8B5CF6'; // purple
        if (status === 'Concluído') return '#10B981'; // green
        if (status === 'Excluído') return '#EF4444'; // red
        if (status === 'Sem Nota Fiscal') return '#E11D48'; // rose
        if (status === 'Cobrado') return '#D946EF'; // fuchsia
        if (status === 'Resposta Recebida (Sem Anexo)') return '#14B8A6'; // teal
        return '#CBD5E1';
    });

    if (chartStatusInstance) {
        chartStatusInstance.destroy();
    }

    chartStatusInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: { font: { size: 10, family: "'DM Sans', sans-serif" }, boxWidth: 10, padding: 8 }
                }
            }
        }
    });
}

async function initiateEmailReading() {
    showToast("Iniciando leitura de e-mails...", "info");
    try {
        const response = await fetch(API_ROUTES.readEmails + getMailboxQuery(), { method: 'POST' });
        const data = await response.json();
        if (response.ok || data.success) {
            showToast(data.message || "Leitura finalizada!", "success");
            refreshAll();
        } else {
            showToast(data.message || "Erro ao ler e-mails", "error");
        }
    } catch (error) {
        showToast("Erro ao conectar com servidor", "error");
    }
}

async function processQueue() {
    const btn = document.getElementById('btn-process-queue');
    if (btn) {
        if (btn.disabled) return;
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader" class="spin"></i> Processando...`;
        lucide.createIcons();
    }
    showToast("Processando fila...", "info");
    try {
        const response = await fetch(API_ROUTES.processQueue + getMailboxQuery(), { method: 'POST' });
        const data = await response.json();
        if (response.ok) {
            showToast(data.message || "Fila processada com sucesso!", "success");
            refreshAll();
        } else {
            showToast(data.error || "Erro ao processar fila", "error");
        }
    } catch (error) {
        showToast("Erro de conexão ao processar", "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="zap" style="width: 16px; height: 16px;"></i> Processar Tudo`;
            lucide.createIcons();
        }
    }
}

async function processSingle(emailId, directToFiscal = false, btnElement = null) {
    if (btnElement) {
        if (btnElement.disabled) return;
        btnElement.disabled = true;
        btnElement.innerHTML = `<i data-lucide="loader" class="spin"></i> Carregando...`;
        lucide.createIcons();
    }
    showToast("Carregando preview do e-mail...", "info");
    try {
        const url = `${API_ROUTES.previewSingle}?id=${emailId}`;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success && result.data) {
            extractedData = result.data;
            window.currentPreviewId = result.preview_id || null;
            vendorGroups = groupByVendor(extractedData);
            
            // Reutiliza a lógica buildVendorTabs do manual (certifique-se que o elemento vendor-tabs existe no HTML)
            buildVendorTabs();
            
            // Mostra o modal
            const modal = document.getElementById('modalPreviewSingle');
            if (modal) {
                modal.style.display = 'flex';
            }
            showToast(`Preview carregado com sucesso!`, 'success');
        } else {
            showToast(result.error || result.message || "Falha ao carregar preview", "error");
        }
    } catch (error) {
        showToast("Erro técnico ao carregar preview", "error");
    } finally {
        if (btnElement) {
            btnElement.disabled = false;
            btnElement.innerHTML = `<i data-lucide="zap"></i> Processar`;
            lucide.createIcons();
        }
    }
}

function fecharModalPreviewSingle() {
    const modal = document.getElementById('modalPreviewSingle');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function confirmarProcessamentoSingle() {
    // Reutiliza o readEditedLotes que lê a DOM e retorna lotes
    const lotesEditados = readEditedLotes();
    
    // Como a lógica do readEditedLotes lê `#email-recipient`, mas no modal o id é `#email-recipient-single`
    // Precisamos ajustar temporariamente para ler do single
    const recipientSingle = document.getElementById('email-recipient-single')?.value;
    if (recipientSingle) {
        lotesEditados.forEach(lote => {
            lote.destinatario = recipientSingle;
        });
    }

    if (!lotesEditados || lotesEditados.length === 0) {
        showToast('Nenhum dado válido para enviar.', 'error');
        return;
    }

    const btnSend = document.getElementById('btn-send-single-preview');
    if (btnSend) {
        btnSend.disabled = true;
        btnSend.innerHTML = '<i data-lucide="loader" class="spin"></i> Enviando...';
        lucide.createIcons();
    }

    showToast('Processando lotes e enviando...', 'info');

    try {
        const payload = {
            lotes: lotesEditados,
            preview_id: window.currentPreviewId,
            mailbox: new URLSearchParams(window.location.search).get("mailbox_filter")
        };

        const response = await fetch(API_ROUTES.processManual, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (result.success) {
            showToast('Processamento concluído com sucesso!', 'success');
            fecharModalPreviewSingle();
            refreshAll(); // Atualiza a tela principal (Remove da fila pendente)
        } else {
            showToast(result.message || 'Erro ao processar', 'error');
        }
    } catch (error) {
        showToast('Erro técnico ao confirmar processamento', 'error');
    } finally {
        if (btnSend) {
            btnSend.disabled = false;
            btnSend.innerHTML = '<i data-lucide="send"></i> Confirmar Envio';
            lucide.createIcons();
        }
    }
}

async function deleteEmail(emailId) {
    const observation = prompt("Tem certeza que deseja ignorar este e-mail? Ele não será processado e sairá da fila pendente.\n\nSe desejar, insira uma observação / justificativa:");
    if (observation === null) return; // Se clicou em cancelar
    
    showToast("Ignorando e-mail...", "info");
    try {
        const response = await fetch(`/api/emails/delete?id=${encodeURIComponent(emailId)}&observation=${encodeURIComponent(observation)}`, { method: 'POST' });
        const data = await response.json();
        if (response.ok || data.success) {
            showToast("E-mail excluído com sucesso!", "success");
            refreshAll();
        } else {
            showToast(data.message || "Falha ao ignorar", "error");
        }
    } catch (error) {
        showToast("Erro técnico ao ignorar", "error");
    }
}

// ==========================================
// LÓGICA DE RENDENRIZAÇÃO COM PAGINAÇÃO
// ==========================================
const currentMonthStr = String(new Date().getMonth() + 1).padStart(2, '0') + '/' + new Date().getFullYear();
let extractedCurrentMonth = currentMonthStr;
let globalSearchTerm = "";

let searchDebounceTimeout = null;
function handleGlobalSearch() {
    clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(() => {
        const searchInput = document.getElementById('master-search-input');
        if (searchInput) {
            globalSearchTerm = searchInput.value.toLowerCase().trim();
            // Reset pages
            dataStore.pending.page = 1;
            dataStore.processed.page = 1;
            dataStore.extracted.page = 1;
            
            // Re-render currently active tab or all
            renderPendingTable();
            renderExtractedTable();
            renderProcessedTable();
        }
    }, 300);
}

function getFilteredData(type) {
    let dataset = dataStore[type].data;
    
    // Month filter for extracted
    if (type === 'extracted' && extractedCurrentMonth !== "all") {
        dataset = dataset.filter(nf => {
            if (!nf.data_envio || nf.data_envio === "N/A") return false;
            const parts = nf.data_envio.split('/');
            if (parts.length >= 3) {
                const monthYear = `${parts[1]}/${parts[2].substring(0,4)}`;
                return monthYear === extractedCurrentMonth;
            }
            return false;
        });
    }
    
    // Global search
    if (globalSearchTerm) {
        dataset = dataset.filter(item => {
            if (type === 'extracted') {
                return (item.fornecedor || "").toLowerCase().includes(globalSearchTerm) ||
                       (item.numero_nf || item.nf || "").toLowerCase().includes(globalSearchTerm) ||
                       (item.descricao || "").toLowerCase().includes(globalSearchTerm) ||
                       (item.numero_pedido || "").toLowerCase().includes(globalSearchTerm);
            } else {
                return (item.sender || item.remetente || "").toLowerCase().includes(globalSearchTerm) ||
                       (item.subject || item.assunto || "").toLowerCase().includes(globalSearchTerm);
            }
        });
    }
    
    return dataset;
}

function renderPagination(type) {
    const dataset = getFilteredData(type);
    const totalItems = dataset.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
    const container = document.getElementById(`${type}-pagination`);
    const currentPage = dataStore[type].page;

    if (currentPage > totalPages) dataStore[type].page = totalPages;

    container.innerHTML = `
        <div class="page-info">Página ${dataStore[type].page} de ${totalPages} (Total: ${totalItems})</div>
        <div style="display:flex; gap:8px;">
            <button class="btn-page" ${dataStore[type].page <= 1 ? 'disabled' : ''} onclick="changePage('${type}', -1)">Anterior</button>
            <button class="btn-page" ${dataStore[type].page >= totalPages ? 'disabled' : ''} onclick="changePage('${type}', 1)">Próxima</button>
        </div>
    `;
}

function changePage(type, direction) {
    dataStore[type].page += direction;
    if (type === 'pending') renderPendingTable();
    if (type === 'processed') renderProcessedTable();
    if (type === 'extracted') renderExtractedTable();
    if (type === 'extracted') renderExtractedTable();
}

function getPaginatedData(type) {
    const dataset = getFilteredData(type);
    const startIndex = (dataStore[type].page - 1) * ITEMS_PER_PAGE;
    return dataset.slice(startIndex, startIndex + ITEMS_PER_PAGE);
}

function showTableSkeleton(tbodyId, cols) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    let html = '';
    for(let i=0; i<3; i++) {
        html += '<tr class="skeleton-row">';
        for(let j=0; j<cols; j++) {
            html += '<td><div class="skeleton-block"></div></td>';
        }
        html += '</tr>';
    }
    tbody.innerHTML = html;
}

async function loadPending(isAutoRefresh = false) {
    if (!isAutoRefresh) showTableSkeleton('pending-tbody', 5);
    try {
        const response = await fetch(API_ROUTES.pending + getMailboxQuery());
        if (response.ok) {
            dataStore.pending.data = await response.json();
            renderPendingTable();
        }
    } catch (error) { }
}

function renderPendingTable() {
    const tbody = document.getElementById('pending-tbody');
    if (!tbody) return;

    const emails = getPaginatedData('pending');

    if (dataStore.pending.data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text2);">Nenhum e-mail pendente na fila.</td></tr>`;
        const pagination = document.getElementById('pending-pagination');
        if (pagination) pagination.innerHTML = '';
        return;
    }

    let html = '';
    emails.forEach(email => {
        const badgeHtml = getStatusBadge(email.status);

        let actionsHtml = '';
        if (email.status === "Pendente") {
            actionsHtml = `
                <button onclick="deleteEmail('${email.id}')" class="btn-table-action btn-excluir" data-tooltip="Excluir e-mail">
                    <i data-lucide="trash-2"></i>
                </button>
                <button onclick="processSingle('${email.id}', false, this)" class="btn-table-action btn-processar">
                    <i data-lucide="zap"></i> Processar
                </button>
            `;
        } else if (email.status === "Aguardando Compras") {
            actionsHtml = `
                <button onclick="deleteEmail('${email.id}')" class="btn-table-action btn-excluir" data-tooltip="Excluir e-mail">
                    <i data-lucide="trash-2"></i>
                </button>
            `;
        } else if (email.status === "Aguardando Envio Fiscal") {
            actionsHtml = `
                <button class="btn-table-action btn-enviar-fiscal" onclick="enviarFiscal('${email.id}')">
                    <i data-lucide="send"></i> Encaminhar p/ Fiscal
                </button>
            `;
        } else if (email.status === "Aguardando Fiscal") {
            actionsHtml = `-`;

        } else if (email.status === "Pronto para Impressão") {
            actionsHtml = `
                <button class="btn-table-action btn-imprimir" onclick="imprimirPacote('${email.id}')">
                    <i data-lucide="printer"></i> Imprimir
                </button>
                <button class="btn-table-action btn-finalizar" onclick="finalizarPacote('${email.id}')">
                    <i data-lucide="check"></i> Finalizar
                </button>
            `;
        } else if (email.status === "Sem Nota Fiscal") {
            actionsHtml = `
                <button onclick="solicitarNFFaltante('${email.id}')" class="btn-table-action" style="color: var(--blue); border-color: var(--blue);" data-tooltip="Cobrar Fornecedor">
                    <i data-lucide="mail"></i> Cobrar NF
                </button>
            `;
        }

        const tooltipHtml = email.body_preview 
            ? `<span class="tooltip-multiline" data-tooltip="${escapeHtml(email.body_preview)}"><i data-lucide="info" class="email-info-icon" style="width: 14px; height: 14px;"></i></span>` 
            : '';

        const attachCount = email.attachment_count || 0;
        const attachBadgeHtml = attachCount > 0
            ? `<span style="display:inline-flex;align-items:center;gap:3px;background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:1px 5px;font-size:11px;color:var(--text2);white-space:nowrap;flex-shrink:0;" data-tooltip="${attachCount} anexo${attachCount !== 1 ? 's' : ''}">
                   <i data-lucide="paperclip" style="width:11px;height:11px;"></i>${attachCount}
               </span>`
            : '';

        html += `
        <tr>
            <td style="color:var(--text); font-weight: 500;">${escapeHtml(email.sender_name || email.sender)}</td>
            <td style="max-width: 250px;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; width: 100%;">
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${escapeHtml(email.subject)}</span>
                    <span style="display:inline-flex;align-items:center;gap:4px;flex-shrink:0;">
                        ${attachBadgeHtml}
                        ${tooltipHtml}
                    </span>
                </div>
            </td>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--text2)">${formatarData(email.date)}</td>
            <td>${badgeHtml}</td>
            <td>
                <div style="display: flex; gap: 8px; justify-content: flex-end; align-items: center;">
                    ${actionsHtml}
                </div>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
    lucide.createIcons({ root: tbody });
    renderPagination('pending');
}

async function loadProcessedEmails(isAutoRefresh = false) {
    if (!isAutoRefresh) showTableSkeleton('processed-tbody', 5);
    try {
        const [resProcessed, resDeleted] = await Promise.all([
            fetch(API_ROUTES.processed + getMailboxQuery()),
            fetch(API_ROUTES.deleted + getMailboxQuery())
        ]);
        
        let allData = [];
        if (resProcessed.ok) {
            const processedData = await resProcessed.json();
            processedData.forEach(item => { item._hist_status = "Sucesso"; });
            allData = allData.concat(processedData);
        }
        if (resDeleted.ok) {
            const deletedData = await resDeleted.json();
            deletedData.forEach(item => { item._hist_status = "Excluído"; });
            allData = allData.concat(deletedData);
        }
        
        // Ordenar por data mais recente
        allData.sort((a, b) => {
            const dateA = new Date(a.received_at || a.date || 0).getTime();
            const dateB = new Date(b.received_at || b.date || 0).getTime();
            return dateB - dateA;
        });

        dataStore.processed.data = allData;
        renderProcessedTable();
    } catch (error) { console.error("Erro ao carregar histórico", error); }
}

function renderProcessedTable() {
    const tbody = document.getElementById('processed-tbody');
    if (!tbody) return;
    const emails = getPaginatedData('processed');

    if (dataStore.processed.data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text2);">Nenhum registro encontrado.</td></tr>`;
        document.getElementById('processed-pagination').innerHTML = '';
        return;
    }

    let html = '';
    emails.forEach(email => {
        const pt = email.process_type || "Automático";
        let typeBadgeBg = "rgba(59,130,246,0.1)";
        let typeBadgeColor = "var(--blue)";
        
        if (pt === "Manual") {
            typeBadgeBg = "rgba(16,185,129,0.1)";
            typeBadgeColor = "var(--green)";
        } else if (pt === "Massa") {
            typeBadgeBg = "rgba(245,158,11,0.1)";
            typeBadgeColor = "var(--amber)";
        } else if (pt === "Único") {
            typeBadgeBg = "rgba(124,58,237,0.1)";
            typeBadgeColor = "#a78bfa";
        }
        
        const processTypeHtml = email._hist_status === "Sucesso" ? `<span class="card-badge" style="background:${typeBadgeBg}; color:${typeBadgeColor}; margin-left: 8px; padding: 2px 6px; font-size: 10px; border-radius: 4px; font-weight: 600; text-transform: uppercase;">${pt}</span>` : "";

        const statusBadgeHtml = email._hist_status === "Sucesso" 
            ? `<span class="status-badge status-sucesso" style="background: rgba(16, 185, 129, 0.1); color: var(--green); border: 1px solid rgba(16, 185, 129, 0.2);"><div class="status-dot" style="background: var(--green);"></div>Sucesso</span>`
            : `<span class="status-badge status-excluido" style="background: rgba(100, 116, 139, 0.1); color: var(--text2); border: 1px solid rgba(100, 116, 139, 0.2);"><div class="status-dot" style="background: var(--text3);"></div>Excluído</span>`;

        const acoesHtml = email._hist_status === "Excluído"
            ? `<button onclick="restoreEmail('${email.id}')" class="btn-table-action" style="color: var(--blue); border-color: var(--blue);" data-tooltip="Restaurar para a fila"><i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i></button>`
            : `-`;

        html += `
        <tr>
            <td style="color:var(--text)">${escapeHtml(email.sender_name || email.sender || email.remetente || "N/A")}</td>
            <td style="color:var(--text); font-weight: 500;">${escapeHtml(email.fornecedor || "N/A")}</td>
            <td>${escapeHtml(email.subject || email.assunto || "N/A")}${processTypeHtml}</td>
            <td>${statusBadgeHtml}</td>
            <td style="color:var(--text2); font-size:12px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" data-tooltip="${escapeHtml(email.observation || '')}">${escapeHtml(email.observation || '-')}</td>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--text2)">${formatarData(email.date || email.data_processamento || email.data_recebimento)}</td>
            <td style="text-align: center;">${acoesHtml}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
    lucide.createIcons({ root: tbody });
    renderPagination('processed');
}

function filterExtractedByMonth() {
    const filter = document.getElementById('extracted-month-filter');
    if (filter) {
        extractedCurrentMonth = filter.value;
        dataStore.extracted.page = 1;
        renderExtractedTable();
    }
}

function populateExtractedMonthFilter() {
    const filter = document.getElementById('extracted-month-filter');
    if (!filter) return;
    
    const months = new Set();
    // Garante que o mês atual esteja sempre no filtro
    months.add(extractedCurrentMonth);
    
    dataStore.extracted.data.forEach(nf => {
        if (nf.data_envio && nf.data_envio !== "N/A") {
            const parts = nf.data_envio.split('/');
            if (parts.length >= 3) {
                months.add(`${parts[1]}/${parts[2].substring(0,4)}`);
            }
        }
    });
    
    const options = ['<option value="all">Todos os Meses</option>'];
    Array.from(months).sort((a,b) => b.localeCompare(a)).forEach(m => {
        options.push(`<option value="${m}">${m}</option>`);
    });
    
    const currentVal = filter.value || extractedCurrentMonth;
    filter.innerHTML = options.join('');
    if (months.has(currentVal) || currentVal === "all") {
        filter.value = currentVal;
    }
    upgradeSelectToCustom('extracted-month-filter');
}

async function loadExtractedEmails(isAutoRefresh = false) {
    if (!isAutoRefresh) showTableSkeleton('extracted-tbody', 6);
    try {
        const response = await fetch(API_ROUTES.extracted + getMailboxQuery());
        if (response.ok) {
            dataStore.extracted.data = await response.json();
            populateExtractedMonthFilter();
            renderExtractedTable();
        }
    } catch (error) { }
}



async function restoreEmail(emailId) {
    if (!confirm("Deseja realmente restaurar este e-mail para a fila de pendentes?")) return;
    
    showToast("Restaurando e-mail...", "info");
    try {
        const response = await fetch(`${API_ROUTES.restoreEmail}?id=${encodeURIComponent(emailId)}`, { method: 'POST' });
        const data = await response.json();
        if (response.ok || data.success) {
            showToast("E-mail restaurado com sucesso!", "success");
            refreshAll();
        } else {
            showToast(data.message || "Falha ao restaurar", "error");
        }
    } catch (error) {
        showToast("Erro técnico ao restaurar", "error");
    }
}


function renderExtractedTable() {
    const tbody = document.getElementById("extracted-tbody");
    if (!tbody) return;

    const nfs = getPaginatedData("extracted");

    if (nfs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;color:var(--text2);">Nenhuma nota fiscal extraída encontrada para o filtro selecionado.</td></tr>`;
        const pagination = document.getElementById("extracted-pagination");
        if (pagination) pagination.innerHTML = "";
        return;
    }

    let html = "";
    nfs.forEach(nf => {
        let data_envio = nf.data_envio || "N/A";
        let unidade = nf.unidade || "N/A";
        let fornecedor = nf.fornecedor || "Desconhecido";
        let numero_nf = nf.numero_nf || nf.nf || "N/A";
        let valor = nf.valor || "0,00";
        let descricao = nf.descricao || "-";
        let status = nf.status || "Pendente";
        let numero_pedido = nf.numero_pedido || "-";
        let data_compras = nf.data_envio_compras ? formatarData(nf.data_envio_compras) : "-";
        let data_fiscal = nf.data_envio_fiscal ? formatarData(nf.data_envio_fiscal) : "-";
        let sharepoint_url = nf.sharepoint_url || "";

        const badgeHtml = getStatusBadge(status);

        // Coluna Anexos: link clicável ao SharePoint ou traço
        const anexosHtml = sharepoint_url
            ? `<a href="${escapeHtml(sharepoint_url)}" target="_blank" rel="noopener noreferrer"
                  style="display:inline-flex;align-items:center;gap:5px;color:var(--accent);font-size:12px;text-decoration:none;font-weight:500;"
                  data-tooltip="Ver pasta no SharePoint">
                  <i data-lucide="folder-open" style="width:14px;height:14px;"></i> SharePoint
               </a>`
            : `<span style="color:var(--text2);font-size:12px;">—</span>`;

        html += `
        <tr>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--text2);">${formatarData(data_envio)}</td>
            <td style="color:var(--text); font-weight: 500;">${escapeHtml(unidade)}</td>
            <td style="color:var(--text);">${escapeHtml(fornecedor)}</td>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--text);">${escapeHtml(numero_nf)}</td>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--accent); font-weight:500;">${escapeHtml(valor)}</td>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--text2);">${formatarData(nf.vencimento)}</td>
            <td style="color:var(--text2); font-size:12px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" data-tooltip="${escapeHtml(descricao)}">${escapeHtml(descricao)}</td>
            <td>${badgeHtml}</td>
            <td style="text-align:center;">${anexosHtml}</td>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--accent); font-weight: 500;">${escapeHtml(numero_pedido)}</td>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--text2);">${escapeHtml(data_compras)}</td>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--text2);">${escapeHtml(data_fiscal)}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
    lucide.createIcons({ root: tbody });
    renderPagination('extracted');
}

function exportarExcel() {
    const tbody = document.getElementById("extracted-tbody");
    if (!tbody) return;
    const table = tbody.closest('table');
    if (!table) return;

    try {
        const wb = XLSX.utils.table_to_book(table, {sheet: "Notas Extraídas"});
        XLSX.writeFile(wb, 'notas_fiscais_extraidas.xlsx');
        showToast("Download do Excel concluído com sucesso!", "success");
    } catch (error) {
        showToast("Erro ao tentar exportar arquivo", "error");
    }
}

// ==========================================
// TASK 2: LOGS DE AUDITORIA (OFFCANVAS)
// ==========================================
function toggleLogs() {
    const offcanvas = document.getElementById('logs-offcanvas');
    const overlay = document.getElementById('logs-overlay');

    if (offcanvas.classList.contains('open')) {
        offcanvas.classList.remove('open');
        overlay.classList.remove('show');
    } else {
        offcanvas.classList.add('open');
        overlay.classList.add('show');
        fetchLogs();
    }
}

async function fetchLogs() {
    const container = document.getElementById('logs-container');
    container.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text2);"><i data-lucide="loader" class="status-pulse"></i> Buscando registros...</div>';
    lucide.createIcons();

    try {
        const response = await fetch(API_ROUTES.logs);
        if (!response.ok) throw new Error('Rota indisponível');
        const logs = await response.json();

        if (!logs || logs.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text2);">Nenhum log encontrado.</div>';
            return;
        }

        let html = '';
        logs.forEach(log => {
            const levelClass = log.level === 'ERROR' ? 'log-level-error' : (log.level === 'SUCCESS' ? 'log-level-success' : 'log-level-info');
            html += `
            <div class="log-entry">
                <span class="log-time">${formatarData(log.timestamp)}</span>
                <span class="${levelClass}">[${escapeHtml(log.level)}]</span>
                <span class="log-message">${escapeHtml(log.message)}</span>
            </div>`;
        });
        container.innerHTML = html;
    } catch (error) {}
}

// ==========================================
// TASK 3: ENVIO MANUAL — FLUXO POR FORNECEDOR
// ==========================================
let manualFiles = [];
let extractedData = []; // [{arquivo, fornecedor, unidade, numero_nf, emissao, vencimento, valor, descricao, reconhecido, sugestao_fornecedor, sugestao_score}, ...]
let vendorGroups = {};  // { "Oracle": [...], "TOTVS": [...], "": [...] }

async function processFilesForPreview() {
    const fileInput = document.getElementById('manualFileInput');
    if (!fileInput || fileInput.files.length === 0) return;
    manualFiles = manualFiles.concat(Array.from(fileInput.files));
    fileInput.value = "";
    renderManualFileList();
}

function handleManualFileDrop(files) {
    if (!files || files.length === 0) return;
    manualFiles = manualFiles.concat(Array.from(files));
    renderManualFileList();
}

function renderManualFileList() {
    const listContainer = document.getElementById('manual-files-list');
    const btnExtract = document.getElementById('btn-extract-manual');
    const badge = document.getElementById('file-count-badge');

    if (badge) badge.textContent = `${manualFiles.length} arquivo(s)`;

    if (manualFiles.length === 0) {
        listContainer.innerHTML = '<div style="text-align: center; color: var(--text2); font-size: 13px; padding: 20px; border: 1px dashed var(--border); border-radius: 6px;">Nenhum arquivo na fila</div>';
        if (btnExtract) btnExtract.disabled = true;
        return;
    }
    if (btnExtract) btnExtract.disabled = false;

    let html = '';
    manualFiles.forEach((file, index) => {
        html += `
        <div class="file-item">
            <div style="display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text);">
                <i data-lucide="paperclip" style="width: 16px; height: 16px; color: var(--text2);"></i>
                ${escapeHtml(file.name)}
            </div>
            <button class="remove-btn" onclick="removeManualFile(${index})" data-tooltip="Remover">
                <i data-lucide="x" style="width: 14px; height: 14px;"></i>
            </button>
        </div>`;
    });
    listContainer.innerHTML = html;
    lucide.createIcons();
}

function removeManualFile(index) {
    manualFiles.splice(index, 1);
    renderManualFileList();
}

// --- AGRUPA DADOS POR FORNECEDOR ---
function groupByVendor(data) {
    const groups = {};
    data.forEach(item => {
        const key = item.fornecedor || '';
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    });
    return groups;
}

function getMesAnoVencimento(registros) {
    if (!registros || registros.length === 0) return (new Date().getMonth() + 1).toString().padStart(2, '0') + '/' + new Date().getFullYear();
    for (let i = 0; i < registros.length; i++) {
        let v = registros[i].vencimento;
        if (v && v !== '-' && v.length >= 7) {
            let parts = v.split('/');
            if (parts.length >= 2) {
                let mes = parts[parts.length - 2];
                let ano = parts[parts.length - 1];
                if (mes.length <= 2 && ano.length >= 2) {
                    return `${mes.padStart(2, '0')}/${ano}`;
                }
            }
        }
    }
    return (new Date().getMonth() + 1).toString().padStart(2, '0') + '/' + new Date().getFullYear();
}

// --- CONSTRÓI AS ABAS DE FORNECEDOR ---
function buildVendorTabs() {
    const tabsEl = document.getElementById('vendor-tabs');
    const panelsEl = document.getElementById('vendor-panels');
    const now = new Date();
    const dataStr = now.toLocaleDateString('pt-BR');
    const horaStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let tabsHtml = '';
    let panelsHtml = '';
    let isFirst = true;
    let totalLotes = Object.keys(vendorGroups).length;

    for (const [fornecedor, items] of Object.entries(vendorGroups)) {
        const isUnknown = !fornecedor;
        const tabLabel = isUnknown ? '⚠ Não Identificado' : fornecedor;
        const tabClass = `vendor-tab${isUnknown ? ' unknown' : ''}${isFirst ? ' active' : ''}`;
        const panelClass = `vendor-panel${isFirst ? ' active' : ''}`;
        const panelId = `panel-${encodeURIComponent(fornecedor || 'unknown')}`;
        const tabId = `tab-${encodeURIComponent(fornecedor || 'unknown')}`;

        tabsHtml += `<button class="${tabClass}" id="${tabId}" onclick="switchVendorTab('${escapeHtml(fornecedor || 'unknown')}')">
            ${isUnknown ? '<i data-lucide="alert-triangle" style="width:14px;height:14px;"></i>' : '<i data-lucide="building-2" style="width:14px;height:14px;"></i>'}
            ${escapeHtml(tabLabel)} <span style="opacity:0.6;font-size:11px;">(${items.length})</span>
        </button>`;

        // Banner de fuzzy (apenas para não identificados com sugestão)
        let fuzzyBanner = '';
        if (isUnknown) {
            const itemComSugestao = items.find(i => i.sugestao_fornecedor);
            if (itemComSugestao) {
                fuzzyBanner = `
                <div class="fuzzy-banner">
                    <div class="fuzzy-banner-text">
                        <i data-lucide="sparkles" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;"></i>
                        Não reconhecemos este fornecedor. Seria <strong>${escapeHtml(itemComSugestao.sugestao_fornecedor)}</strong>
                        <span style="opacity:0.7;font-size:11px;">(${itemComSugestao.sugestao_score}% de similaridade)</span>?
                    </div>
                    <div class="fuzzy-banner-actions">
                        <button class="btn-fuzzy-confirm" onclick="applyFuzzyMatch('${escapeHtml(itemComSugestao.sugestao_fornecedor)}')">✓ Confirmar</button>
                        <button class="btn-fuzzy-ignore" onclick="this.closest('.fuzzy-banner').remove()">✗ Excluir</button>
                    </div>
                </div>`;
            }
        }

        // Tabela editável
        let rows = '';
        items.forEach((item, idx) => {
            rows += `<tr data-idx="${idx}" data-fornecedor="${escapeHtml(fornecedor)}">
                <td>${escapeHtml(dataStr + ' ' + horaStr)}</td>
                <td contenteditable="true">${escapeHtml(item.unidade || 'N/A')}</td>
                <td contenteditable="true">${escapeHtml(item.fornecedor || '-')}</td>
                <td contenteditable="true">${escapeHtml(item.numero_nf || '-')}</td>
                <td contenteditable="true">${escapeHtml(item.emissao || '-')}</td>
                <td contenteditable="true">${escapeHtml(item.valor || '0,00')}</td>
                <td contenteditable="true">${escapeHtml(item.vencimento || '-')}</td>
                <td contenteditable="true">${escapeHtml(item.descricao || '-')}</td>
            </tr>`;
        });

        // Preview estilo e-mail
        const currentMonthYear = getMesAnoVencimento(items);
        const subject = fornecedor
            ? `Faturas - ${fornecedor} - ${currentMonthYear}`
            : `Faturas - Não Identificado - ${currentMonthYear}`;

        panelsHtml += `
        <div class="vendor-panel ${isFirst ? 'active' : ''}" id="${panelId}">
            ${fuzzyBanner}
            <div class="email-preview-wrap">
                <div class="email-preview-header">
                    <div style="margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
                        <label style="font-size: 13px; font-weight: 600; color: #4b5563; display: block; margin-bottom: 4px;">Assunto do E-mail:</label>
                        <input type="text" id="subject-${panelId}" value="${escapeHtml(subject)}" style="width: 100%; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                    </div>
                    <div class="email-sender-row">
                        <div class="email-avatar">CT</div>
                        <div>
                            <div style="font-size:14px;color:#1f497d;">Contratos TI Homologação</div>
                            <div style="font-size:12px;color:#6b7280;">Para <span class="sim-recipient">Contratos TI Homologação</span></div>
                        </div>
                    </div>
                </div>
                <p style="font-size:13px;margin-bottom:12px;color:#000;">Seguem os dados das faturas de <strong>${escapeHtml(fornecedor || 'fornecedor não identificado')}</strong> — ${dataStr} às ${horaStr}:</p>
                <div style="overflow-x:auto;">
                    <table class="editable-table">
                        <thead>
                            <tr>
                                <th>Data de Envio</th>
                                <th>Unidade</th>
                                <th>Fornecedor</th>
                                <th>Nº da NF</th>
                                <th>Emissão</th>
                                <th>Valor (R$)</th>
                                <th>Vencimento</th>
                                <th>Descrição</th>
                            </tr>
                        </thead>
                        <tbody id="tbody-${panelId}">
                            ${rows}
                        </tbody>
                    </table>
                </div>
                <p style="font-size:12px;color:#6b7280;margin-top:12px;">💡 Clique em qualquer célula para editar os dados antes de enviar.</p>
            </div>
        </div>`;

        isFirst = false;
    }

    tabsEl.innerHTML = tabsHtml;
    panelsEl.innerHTML = panelsHtml;

    const infoEl = document.getElementById('lotes-info');
    if (infoEl) infoEl.textContent = `${totalLotes} lote(s) para enviar`;

    const sendBtn = document.getElementById('btn-send-all');
    if (sendBtn) {
        if (totalLotes === 1) {
            sendBtn.innerHTML = '<i data-lucide="send" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle; margin-right: 6px;"></i> Enviar';
        } else {
            sendBtn.innerHTML = '<i data-lucide="send" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle; margin-right: 6px;"></i> Enviar Todos os Lotes';
        }
    }

    lucide.createIcons();
}

function switchVendorTab(fornecedor) {
    document.querySelectorAll('.vendor-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.vendor-panel').forEach(p => p.classList.remove('active'));
    const panelId = `panel-${encodeURIComponent(fornecedor)}`;
    const tabId = `tab-${encodeURIComponent(fornecedor)}`;
    const tab = document.getElementById(tabId);
    const panel = document.getElementById(panelId);
    if (tab) tab.classList.add('active');
    if (panel) panel.classList.add('active');
}

async function applyFuzzyMatch(sugestao) {
    // Aplica a sugestão e salva no dicionário via auto-aprendizado
    const unknownItems = vendorGroups[''] || [];
    unknownItems.forEach(item => { item.fornecedor = sugestao; });
    vendorGroups[sugestao] = (vendorGroups[sugestao] || []).concat(unknownItems);
    delete vendorGroups[''];
    buildVendorTabs();
    showToast(`Fornecedor "${sugestao}" aplicado! Salvando no dicionário...`, 'info');

    // Auto-aprendizado: salva no vendor_rules.json
    try {
        await fetch(API_ROUTES.vendors, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: sugestao.toUpperCase(), fornecedor: sugestao, unidade: 'Sede' })
        });
        showToast(`"${sugestao}" adicionado ao dicionário — será reconhecido automaticamente!`, 'success');
    } catch (e) {
        showToast('Não foi possível salvar no dicionário', 'warning');
    }
}

async function extractAndConfirm() {
    if (manualFiles.length === 0) {
        showToast('Selecione pelo menos um documento', 'error');
        return;
    }
    
    const btnExtract = document.getElementById('btn-extract-manual');
    const originalBtnText = btnExtract.innerHTML;
    btnExtract.disabled = true;
    btnExtract.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 6px; animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Extraindo dados... aguarde';
    // Opcionalmente podemos recriar icones pendentes, mas o nosso SVG inline já funciona sem o Lucide
    lucide.createIcons();
    
    showToast('Lendo documentos com OCR...', 'info');

    const formData = new FormData();
    manualFiles.forEach((file, idx) => formData.append(`file_${idx}`, file));

    try {
        const response = await fetch(API_ROUTES.previewOcr, { method: 'POST', body: formData });
        const result = await response.json();

        if (result.success && result.data) {
            extractedData = result.data;
            window.currentPreviewId = result.preview_id || null;
            vendorGroups = groupByVendor(extractedData);
            buildVendorTabs();

            document.getElementById('phase1-container').style.display = 'none';
            document.getElementById('phase2-container').style.display = 'block';
            showToast(`${result.data.length} documento(s) extraído(s)!`, 'success');
        } else {
            showToast(result.error || result.message || 'Erro na leitura de OCR', 'error');
        }
    } catch (error) {
        showToast('Erro ao conectar com servidor de OCR', 'error');
    } finally {
        btnExtract.disabled = false;
        btnExtract.innerHTML = originalBtnText;
        lucide.createIcons();
    }
}

function backToPhase1() {
    document.getElementById('phase2-container').style.display = 'none';
    document.getElementById('phase1-container').style.display = 'block';
}

// --- Lê os dados editados inline das tabelas ---
function readEditedLotes() {
    const destinatario = document.getElementById('email-recipient')?.value || '';
    const lotes = [];

    for (const [fornecedor, items] of Object.entries(vendorGroups)) {
        const panelId = `panel-${encodeURIComponent(fornecedor || 'unknown')}`;
        const tbody = document.getElementById(`tbody-${panelId}`);
        if (!tbody) continue;

        const registros = [];
        tbody.querySelectorAll('tr').forEach((row, rowIdx) => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 8) return;
            const originalItem = items[rowIdx] || {};
            registros.push({
                arquivo: originalItem.arquivo || '',
                boleto_arquivo: originalItem.boleto_arquivo || '',
                fornecedor: cells[2].innerText.trim() || fornecedor,
                unidade: cells[1].innerText.trim(),
                numero_nf: cells[3].innerText.trim(),
                emissao: cells[4].innerText.trim(),
                valor: cells[5].innerText.trim(),
                vencimento: cells[6].innerText.trim(),
                descricao: cells[7].innerText.trim(),
            });
        });

        if (registros.length > 0) {
            const subjectInput = document.getElementById(`subject-${panelId}`);
            const currentMonthYear = getMesAnoVencimento(registros);
            const subjectVal = subjectInput ? subjectInput.value : `Faturas - ${fornecedor || 'Não Identificado'} - ${currentMonthYear}`;

            lotes.push({
                fornecedor: fornecedor || 'Desconhecido',
                destinatario,
                assunto: subjectVal,
                registros,
            });
        }
    }
    return lotes;
}

async function confirmManualProcess() {
    const lotes = readEditedLotes();
    if (lotes.length === 0) {
        showToast('Nenhum lote para processar', 'error');
        return;
    }

    showToast(`Enviando ${lotes.length} lote(s)...`, 'info');

    try {
        const payload = {
            lotes: lotes,
            preview_id: window.currentPreviewId || null
        };
        const response = await fetch(API_ROUTES.processManual + getMailboxQuery(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (data.success) {
            (data.resultados || []).forEach(r => {
                const status = r.status === 'enviado' ? 'success' : 'warning';
                showToast(`${r.fornecedor}: ${r.status === 'enviado' ? 'enviado ✓' : r.status}`, status);
            });

            setTimeout(() => {
                document.getElementById('phase2-container').style.display = 'none';
                document.getElementById('phase1-container').style.display = 'block';
                manualFiles = [];
                extractedData = [];
                vendorGroups = {};
                renderManualFileList();
                if (typeof refreshAll === 'function') refreshAll();
                // Se estivermos na página de envio manual separada, redireciona para o root
                window.location.href = '/';
            }, 1000);
        } else {
            showToast(data.message || 'Falha no processamento', 'error');
        }
    } catch (error) {
        showToast('Erro ao comunicar com o servidor', 'error');
    }
}

// ==========================================
// CONFIGURAÇÃO DE FORNECEDORES
// ==========================================
let allVendors = {};

async function loadVendors() {
    const tbodyUb = document.getElementById('vendors-ub-tbody');
    const tbodyFilial = document.getElementById('vendors-Filial-tbody');
    showTableSkeleton('vendors-ub-tbody', 4);
    showTableSkeleton('vendors-Filial-tbody', 4);

    try {
        const response = await fetch(API_ROUTES.vendors);
        allVendors = await response.json();
        renderVendors(allVendors);
        
        // Garante que a aba UB seja exibida por padrão, contornando a limpeza global
        if(document.getElementById('tab-ub-btn')) {
            switchVendorTab('ub');
        }
    } catch (error) {
        showToast("Erro ao carregar fornecedores", "error");
    }
}

function renderVendors(vendors) {
    const tbodyUb = document.getElementById('vendors-ub-tbody');
    const tbodyFilial = document.getElementById('vendors-Filial-tbody');
    let htmlUb = '';
    let htmlFilial = '';
    
    // UB units não contém barras (/UF). Ex: Matriz, Filial Norte, Filial Sul
    
    for (const [key, data] of Object.entries(vendors)) {
        const unidade = data.unidade || "";
        const isUb = !unidade.includes('/');
        
        const row = `
        <tr>
            <td>${escapeHtml(key)}</td>
            <td>${escapeHtml(data.fornecedor)}</td>
            <td>${escapeHtml(data.unidade)}</td>
            <td style="text-align: center;">
                <div style="display: inline-flex; gap: 8px;">
                    <button class="btn btn-secondary btn-action-sm" onclick="editVendor('${escapeHtml(key)}')">Editar</button>
                    <button class="btn btn-danger btn-action-sm" onclick="deleteVendor('${escapeHtml(key)}')">Excluir</button>
                </div>
            </td>
        </tr>`;
        
        if (isUb) {
            htmlUb += row;
        } else {
            htmlFilial += row;
        }
    }
    
    tbodyUb.innerHTML = htmlUb || '<tr><td colspan="4" style="text-align:center;">Nenhum fornecedor UB encontrado.</td></tr>';
    tbodyFilial.innerHTML = htmlFilial || '<tr><td colspan="4" style="text-align:center;">Nenhum fornecedor Filial encontrado.</td></tr>';
}

function filterVendors() {
    const searchTerm = document.getElementById('vendor-search').value.toLowerCase();
    const filtered = {};
    
    for (const [key, data] of Object.entries(allVendors)) {
        if (key.toLowerCase().includes(searchTerm) || 
            data.fornecedor.toLowerCase().includes(searchTerm) || 
            data.unidade.toLowerCase().includes(searchTerm)) {
            filtered[key] = data;
        }
    }
    renderVendors(filtered);
}

function openVendorModal(key = null, fornecedor = '', unidade = '') {
    const modal = document.getElementById('vendor-modal');
    const title = document.getElementById('modal-title');
    const keyInput = document.getElementById('vendor-key');
    const nameInput = document.getElementById('vendor-name');
    const unitInput = document.getElementById('vendor-unit');

    if (key) {
        title.innerText = 'Editar Fornecedor';
        keyInput.value = key;
        keyInput.disabled = true; // Chave é o identificador único
        nameInput.value = fornecedor;
        unitInput.value = unidade;
    } else {
        title.innerText = 'Adicionar Fornecedor';
        keyInput.value = '';
        keyInput.disabled = false;
        nameInput.value = '';
        unitInput.value = '';
    }
    modal.classList.add('show');
}

function closeVendorModal() {
    document.getElementById('vendor-modal').classList.remove('show');
}

async function saveVendor() {
    const key = document.getElementById('vendor-key').value;
    const fornecedor = document.getElementById('vendor-name').value;
    const unidade = document.getElementById('vendor-unit').value;

    if (!key || !fornecedor) {
        showToast("Chave e Fornecedor são obrigatórios", "error");
        return;
    }

    try {
        const response = await fetch(`${API_ROUTES.vendors}/${encodeURIComponent(key)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fornecedor, unidade })
        });

        if (response.ok) {
            showToast("Fornecedor salvo com sucesso!", "success");
            closeVendorModal();
            loadVendors();
        } else {
            showToast("Erro ao salvar fornecedor", "error");
        }
    } catch (error) {
        showToast("Erro de conexão", "error");
    }
}

async function editVendor(key) {
    // Busca dados atuais na tabela ou via API
    const response = await fetch(API_ROUTES.vendors);
    const vendors = await response.json();
    const data = vendors[key];
    if (data) {
        openVendorModal(key, data.fornecedor, data.unidade);
    }
}

async function deleteVendor(key) {
    if (!confirm(`Deseja realmente excluir o fornecedor ${key}?`)) return;

    try {
        const response = await fetch(`${API_ROUTES.vendors}/${encodeURIComponent(key)}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast("Fornecedor excluído!", "success");
            loadVendors();
        } else {
            showToast("Erro ao excluir", "error");
        }
    } catch (error) {
        showToast("Erro de conexão", "error");
    }
}
// --- Funções de Ação do Workflow Kanban ---

async function simularCompras(emailId) {
    showToast("Simulando resposta do Compras...", "info");
    try {
        const response = await fetch(`/api/debug/simulate_compras/${emailId}`);
        const data = await response.json();
        if (response.ok && data.success) {
            showToast("Resposta do compras processada com sucesso!", "success");
            refreshAll();
        } else {
            showToast(data.error || "Erro ao simular", "error");
        }
    } catch (e) {
        showToast("Erro de conexão", "error");
    }
}

async function simularFiscal(emailId) {
    showToast("Simulando resposta do Fiscal (Anexando Capa)...", "info");
    try {
        const response = await fetch(`/api/debug/simulate_fiscal/${emailId}`);
        const data = await response.json();
        if (response.ok && data.success) {
            showToast("Resposta do fiscal recebida. Pacote pronto para impressão!", "success");
            refreshAll();
        } else {
            showToast(data.error || "Erro ao simular", "error");
        }
    } catch (e) {
        showToast("Erro de conexão", "error");
    }
}

async function enviarFiscal(emailId) {
    showToast("Enviando pacote para o Fiscal...", "info");
    try {
        const response = await fetch("/api/workflow/enviar_fiscal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email_id: emailId })
        });
        const data = await response.json();
        if (response.ok && data.success) {
            showToast("Pacote enviado com sucesso!", "success");
            refreshAll();
        } else {
            showToast(data.message || "Erro ao enviar", "error");
        }
    } catch (e) {
        showToast("Erro de conexão", "error");
    }
}

function imprimirPacote(emailId) {
    showToast("Abrindo pacote para impressão...", "info");
    window.open(`/api/workflow/print_pacote/${emailId}`, '_blank');
}

async function finalizarPacote(emailId) {
    if (!confirm("Você já imprimiu os documentos? Deseja finalizar o pacote?")) return;

    showToast("Finalizando pacote...", "info");
    try {
        const response = await fetch("/api/workflow/finalizar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email_id: emailId })
        });
        const data = await response.json();
        if (response.ok && data.success) {
            showToast("Pacote finalizado e arquivado!", "success");
            refreshAll();
        } else {
            showToast(data.message || "Erro ao finalizar", "error");
        }
    } catch (e) {
        showToast("Erro de conexão", "error");
    }
}

async function autoComprasTudo() {
    showToast("Disparando automação do Compras em lote...", "info");
    try {
        const response = await fetch("/api/debug/simulate_compras_all", { method: "POST" });
        const data = await response.json();
        if (response.ok && data.success) {
            showToast("Automação do Compras iniciada! Atualizando em 5 segundos...", "success");
            setTimeout(refreshAll, 5000);
        } else {
            showToast(data.error || "Erro ao acionar automação", "error");
        }
    } catch (e) {
        showToast("Erro de conexão", "error");
    }
}

async function autoFiscalTudo() {
    showToast("Disparando automação do Fiscal em lote...", "info");
    try {
        const response = await fetch("/api/debug/simulate_fiscal_all", { method: "POST" });
        const data = await response.json();
        if (response.ok && data.success) {
            showToast("Automação do Fiscal iniciada! Atualizando em 5 segundos...", "success");
            setTimeout(refreshAll, 5000);
        } else {
            showToast(data.error || "Erro ao acionar automação", "error");
        }
    } catch (e) {
        showToast("Erro de conexão", "error");
    }
}


function switchVendorTab(tabId) {
    // 1. Remove active classes from vendor tabs
    const btnUb = document.getElementById('tab-ub-btn');
    const btnFilial = document.getElementById('tab-Filial-btn');
    const tabUb = document.getElementById('ub-tab');
    const tabFilial = document.getElementById('Filial-tab');
    
    if (btnUb) btnUb.classList.remove('active');
    if (btnFilial) btnFilial.classList.remove('active');
    if (tabUb) tabUb.classList.remove('active');
    if (tabFilial) tabFilial.classList.remove('active');
    
    // 2. Add active classes to selected
    const selectedBtn = document.getElementById(`tab-${tabId}-btn`);
    const selectedTab = document.getElementById(`${tabId}-tab`);
    
    if (selectedBtn) selectedBtn.classList.add('active');
    if (selectedTab) selectedTab.classList.add('active');
}

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login';
    } catch (e) {
        console.error("Erro no logout:", e);
    }
}

async function initializeUser() {
    try {
        if (window.location.pathname === '/login') return;

        const res = await fetch('/api/me');
        if (!res.ok) return;
        const user = await res.json();
        
        // 1. Ocultar links administrativos para técnicos
        if (user.role !== 'admin') {
            const navUsuarios = document.querySelector('a[href="/usuarios"]');
            const navAuditoria = document.querySelector('a[href="/auditoria"]');
            if (navUsuarios) navUsuarios.style.display = 'none';
            if (navAuditoria) navAuditoria.style.display = 'none';
        }

        // 2. Preencher Avatar e Menu
        const avatarDiv = document.querySelector('.avatar');
        if (avatarDiv) {
            // Transform avatar into interactive circle
            avatarDiv.style.position = 'relative';
            avatarDiv.style.cursor = 'pointer';
            
            const initialSpan = document.createElement('span');
            initialSpan.textContent = user.username.charAt(0).toUpperCase();
            initialSpan.style.display = 'flex';
            initialSpan.style.alignItems = 'center';
            initialSpan.style.justifyContent = 'center';
            initialSpan.style.width = '36px';
            initialSpan.style.height = '36px';
            initialSpan.style.background = 'var(--accent)';
            initialSpan.style.color = '#fff';
            initialSpan.style.borderRadius = '50%';
            initialSpan.style.fontWeight = 'bold';
            
            avatarDiv.insertBefore(initialSpan, avatarDiv.firstChild);

            // Menu do usuário
            const menuHtml = `
            <div id="user-menu" class="user-menu" style="position: absolute; top: 45px; right: 0; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 8px; display: none; min-width: 180px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000;">
                <div style="padding: 8px 12px; border-bottom: 1px solid var(--border); margin-bottom: 4px; cursor: default;">
                    <div style="font-weight: 600; color: var(--text);">${escapeHtml(user.username)}</div>
                    <div style="font-size: 11px; color: var(--text2); text-transform: uppercase; margin-top: 2px;">
                        ${user.role === 'admin' ? 'Administrador' : 'Técnico'}
                    </div>
                </div>
            </div>
            `;
            avatarDiv.insertAdjacentHTML('beforeend', menuHtml);
            
            const menu = document.getElementById('user-menu');
            avatarDiv.onclick = (e) => {
                if(menu) {
                    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
                    e.stopPropagation();
                }
            };
            
            // Fechar menu ao clicar fora
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.avatar') && menu) {
                    menu.style.display = 'none';
                }
            });
        }

        // 3. Mostrar Caixa de Entrada Monitorada ou Switcher
        const hRight = document.querySelector('.h-right');
        if (hRight) {
            let switcherHtml = '';
            if (user.role === 'admin') {
                switcherHtml = `
                    <div style="display: flex; align-items: center; gap: 8px; margin-right: 16px; background: var(--surface2); padding: 4px 12px; border-radius: 20px; border: 1px solid var(--border); height: 32px;">
                        <i data-lucide="inbox" style="width: 14px; height: 14px; color: var(--text2);"></i>
                        <select id="admin-mailbox-switcher" onchange="onMailboxChange()" style="background: transparent; border: none; color: var(--text); font-size: 12px; font-weight: 600; outline: none; cursor: pointer; height: 100%; width: 100%; padding: 0;">
                            <option value="contratos.ti.homolog@filial.demo.com.br" selected>contratos.ti.homolog@filial.demo.com.br</option>
                            <option value="">Visão Geral (Todas as Caixas)</option>
                            <option value="contratos.ti.sistemas@empresa.demo.com.br">contratos.ti.sistemas@empresa.demo.com.br</option>
                            <option value="contratos.ti@filial.demo.com.br">contratos.ti@filial.demo.com.br</option>
                        </select>
                    </div>
                `;
            } else {
                const mailboxDisplay = user.allowed_mailbox || 'Caixa Geral (Todas)';
                switcherHtml = `
                    <div style="display: flex; align-items: center; gap: 8px; margin-right: 16px; background: var(--surface2); padding: 6px 12px; border-radius: 20px; border: 1px solid var(--border);">
                        <i data-lucide="inbox" style="width: 14px; height: 14px; color: var(--text2);"></i>
                        <span style="font-size: 12px; color: var(--text2); font-weight: 600;">${escapeHtml(mailboxDisplay)}</span>
                    </div>
                `;
            }
            const searchContainer = document.getElementById('top-search-container');
            if (searchContainer) {
                searchContainer.insertAdjacentHTML('afterend', switcherHtml);
            } else {
                hRight.insertAdjacentHTML('afterbegin', switcherHtml);
            }
            lucide.createIcons({ root: hRight });
            if (user.role === 'admin') {
                upgradeSelectToCustom('admin-mailbox-switcher');
            }
        }
    } catch (e) {
        console.error("Erro ao carregar usuário na UI:", e);
    }
}

// --- CUSTOM SELECT DROPDOWN LOGIC ---
function upgradeSelectToCustom(selectId) {
    const originalSelect = document.getElementById(selectId);
    if (!originalSelect) return;
    
    // Remove wrapper antigo se existir para poder atualizar opções dinâmicas
    if (originalSelect.nextElementSibling && originalSelect.nextElementSibling.classList.contains('custom-select-wrapper')) {
        originalSelect.nextElementSibling.remove();
    }

    originalSelect.style.display = 'none';

    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';
    
    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    
    const triggerText = document.createElement('span');
    triggerText.textContent = originalSelect.options[originalSelect.selectedIndex]?.text || '';
    
    const arrow = document.createElement('i');
    arrow.setAttribute('data-lucide', 'chevron-down');
    arrow.style.width = '14px';
    arrow.style.height = '14px';
    arrow.style.color = 'var(--text2)';
    
    trigger.appendChild(triggerText);
    trigger.appendChild(arrow);
    
    const optionsList = document.createElement('div');
    optionsList.className = 'custom-select-options';
    
    Array.from(originalSelect.options).forEach(opt => {
        const optionEl = document.createElement('div');
        optionEl.className = 'custom-select-option';
        optionEl.textContent = opt.text;
        if (opt.selected) optionEl.classList.add('selected');
        
        optionEl.addEventListener('click', (e) => {
            e.stopPropagation();
            originalSelect.value = opt.value;
            triggerText.textContent = opt.text;
            
            Array.from(optionsList.children).forEach(c => c.classList.remove('selected'));
            optionEl.classList.add('selected');
            
            wrapper.classList.remove('open');
            originalSelect.dispatchEvent(new Event('change'));
        });
        optionsList.appendChild(optionEl);
    });
    
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.custom-select-wrapper.open').forEach(w => {
            if (w !== wrapper) w.classList.remove('open');
        });
        wrapper.classList.toggle('open');
    });
    
    wrapper.appendChild(trigger);
    wrapper.appendChild(optionsList);
    
    originalSelect.parentNode.insertBefore(wrapper, originalSelect.nextSibling);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: wrapper });
}

document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select-wrapper.open').forEach(w => w.classList.remove('open'));
});

async function solicitarNFFaltante(emailId) {
    if (!confirm("Deseja enviar um e-mail cobrando a Nota Fiscal deste fornecedor?")) return;
    try {
        const response = await fetch(`/api/solicitar_nf_faltante/${emailId}`, {
            method: 'POST'
        });
        const res = await response.json();
        if (response.ok) {
            showToast(res.message, 'success');
            // Recarregar Fila Pendente
            loadPending();
        } else {
            showToast(`Erro: ${res.detail || 'Desconhecido'}`, 'error');
        }
    } catch (e) {
        showToast(`Erro de conexão: ${e}`, 'error');
    }
}

// Injeção automática de banner para identificar visualmente o ambiente de Desenvolvimento (Porta 8080)
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.port === '8080') {
        const devBanner = document.createElement('div');
        devBanner.className = 'dev-environment-banner';
        devBanner.innerHTML = '⚠️ <b>AMBIENTE DE DESENVOLVIMENTO (PORTA 8080)</b> — Alterações aqui afetam apenas o banco de testes de Dev.';
        document.body.insertBefore(devBanner, document.body.firstChild);
    }
});

