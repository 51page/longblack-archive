// State
let currentPage = 1;
let perPage = 20;
let sortColumn = 'rev24';
let sortDirection = 'desc';
let searchTerm = '';
let profitFilter = 'all';
let yearFilter = '24';
let companyChart = null;

// Parse number
function parseNum(val) {
    if (val === '' || val === null || val === undefined || val === '-') return null;
    const num = parseFloat(String(val).replace(/,/g, ''));
    return isNaN(num) ? null : num;
}

// Format number
function formatNum(val) {
    if (val === null || val === undefined) return '-';
    const num = parseNum(val);
    if (num === null) return '-';
    return num.toLocaleString('ko-KR');
}

// Get trend
function getTrend(company) {
    const p22 = parseNum(company.profit22);
    const p23 = parseNum(company.profit23);
    const p24 = parseNum(company.profit24);
    if (p24 === null || p23 === null) return 'flat';
    if (p24 > p23) return 'up';
    if (p24 < p23) return 'down';
    return 'flat';
}

// Filter and sort data
function getFilteredData() {
    let filtered = financialData.filter(company => {
        if (searchTerm && !company.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }
        const profit = parseNum(company[`profit${yearFilter}`]);
        if (profitFilter === 'profit' && (profit === null || profit <= 0)) return false;
        if (profitFilter === 'loss' && (profit === null || profit >= 0)) return false;
        return true;
    });

    filtered.sort((a, b) => {
        let aVal, bVal;
        if (sortColumn === 'name') {
            aVal = a.name;
            bVal = b.name;
            return sortDirection === 'asc' ? aVal.localeCompare(bVal, 'ko') : bVal.localeCompare(aVal, 'ko');
        } else if (sortColumn === 'trend') {
            const trendOrder = { up: 3, flat: 2, down: 1 };
            aVal = trendOrder[getTrend(a)] || 0;
            bVal = trendOrder[getTrend(b)] || 0;
        } else {
            aVal = parseNum(a[sortColumn]) || 0;
            bVal = parseNum(b[sortColumn]) || 0;
        }
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
}

function getNumClass(val) {
    const num = parseNum(val);
    if (num === null) return 'num-empty';
    return num < 0 ? 'num-negative' : 'num-positive';
}

// Render table
function renderTable() {
    const filtered = getFilteredData();
    const totalPages = perPage === 'all' ? 1 : Math.ceil(filtered.length / perPage);
    currentPage = Math.min(currentPage, totalPages) || 1;
    
    const start = perPage === 'all' ? 0 : (currentPage - 1) * perPage;
    const end = perPage === 'all' ? filtered.length : start + perPage;
    const pageData = filtered.slice(start, end);

    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = pageData.map(company => {
        const trend = getTrend(company);
        const trendIcon = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—';
        const trendClass = `trend-${trend}`;
        
        return `
            <tr>
                <td class=""company-name"" data-company=""${company.name}"">${company.name}</td>
                <td class=""${getNumClass(company.rev22)}"">${formatNum(company.rev22)}</td>
                <td class=""${getNumClass(company.profit22)}"">${formatNum(company.profit22)}</td>
                <td class=""${getNumClass(company.rev23)}"">${formatNum(company.rev23)}</td>
                <td class=""${getNumClass(company.profit23)}"">${formatNum(company.profit23)}</td>
                <td class=""${getNumClass(company.rev24)}"">${formatNum(company.rev24)}</td>
                <td class=""${getNumClass(company.profit24)}"">${formatNum(company.profit24)}</td>
                <td><span class=""trend-indicator ${trendClass}""></span>${trendIcon}</td>
            </tr>
        `;
    }).join('');

    document.getElementById('pageInfo').textContent = `${currentPage} / ${totalPages || 1} (총 ${filtered.length}개)`;
    document.getElementById('prevBtn').disabled = currentPage <= 1;
    document.getElementById('nextBtn').disabled = currentPage >= totalPages;

    document.querySelectorAll('th').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        if (th.dataset.column === sortColumn) {
            th.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
        }
    });
}

// Render stats
function renderStats() {
    const data = financialData;
    const total = data.length;
    const profitable24 = data.filter(c => parseNum(c.profit24) > 0).length;
    const loss24 = data.filter(c => parseNum(c.profit24) < 0).length;
    
    const totalRev24 = data.reduce((sum, c) => sum + (parseNum(c.rev24) || 0), 0);
    const totalRev23 = data.reduce((sum, c) => sum + (parseNum(c.rev23) || 0), 0);
    const revChange = totalRev23 > 0 ? ((totalRev24 - totalRev23) / totalRev23 * 100).toFixed(1) : 0;

    document.getElementById('statsGrid').innerHTML = `
        <div class=""stat-card"">
            <h3>총 기업 수</h3>
            <div class=""value"">${total}개</div>
        </div>
        <div class=""stat-card"">
            <h3>흑자 기업 (24년)</h3>
            <div class=""value"">${profitable24}개</div>
            <div class=""change positive"">${(profitable24/total*100).toFixed(1)}%</div>
        </div>
        <div class=""stat-card"">
            <h3>적자 기업 (24년)</h3>
            <div class=""value"">${loss24}개</div>
            <div class=""change negative"">${(loss24/total*100).toFixed(1)}%</div>
        </div>
        <div class=""stat-card"">
            <h3>총 매출 (24년)</h3>
            <div class=""value"">${(totalRev24/10000).toFixed(0)}조원</div>
            <div class=""change ${revChange >= 0 ? 'positive' : 'negative'}"">${revChange >= 0 ? '+' : ''}${revChange}% YoY</div>
        </div>
    `;
}

// Show company modal
function showCompanyModal(companyName) {
    const company = financialData.find(c => c.name === companyName);
    if (!company) return;

    document.getElementById('modalTitle').textContent = company.name;
    
    const latestProfit = parseNum(company.profit24);
    const profitStatus = latestProfit === null ? '데이터 없음' : latestProfit >= 0 ? '흑자' : '적자';
    
    document.getElementById('companyStats').innerHTML = `
        <div class=""company-stat"">
            <div class=""label"">24년 매출</div>
            <div class=""value"">${formatNum(company.rev24)}억</div>
        </div>
        <div class=""company-stat"">
            <div class=""label"">24년 영업이익</div>
            <div class=""value"" style=""color: ${latestProfit < 0 ? 'var(--negative)' : 'inherit'}"">${formatNum(company.profit24)}억</div>
        </div>
        <div class=""company-stat"">
            <div class=""label"">수익 현황</div>
            <div class=""value"">${profitStatus}</div>
        </div>
        <div class=""company-stat"">
            <div class=""label"">추세</div>
            <div class=""value"">${getTrend(company) === 'up' ? '↑ 상승' : getTrend(company) === 'down' ? '↓ 하락' : '— 유지'}</div>
        </div>
    `;

    renderCompanyChart(company, 'revenue');
    document.getElementById('modalOverlay').classList.add('active');
}

// Render company chart
function renderCompanyChart(company, type) {
    const ctx = document.getElementById('companyChart').getContext('2d');
    
    if (companyChart) {
        companyChart.destroy();
    }

    const labels = ['2022년', '2023년', '2024년'];
    let datasets = [];

    if (type === 'revenue') {
        datasets = [{
            label: '매출 (억원)',
            data: [parseNum(company.rev22), parseNum(company.rev23), parseNum(company.rev24)],
            backgroundColor: 'rgba(153, 15, 61, 0.8)',
            borderColor: '#990F3D',
            borderWidth: 2
        }];
    } else if (type === 'profit') {
        const profitData = [parseNum(company.profit22), parseNum(company.profit23), parseNum(company.profit24)];
        datasets = [{
            label: '영업이익 (억원)',
            data: profitData,
            backgroundColor: profitData.map(v => v >= 0 ? 'rgba(13, 118, 128, 0.8)' : 'rgba(204, 0, 0, 0.8)'),
            borderColor: profitData.map(v => v >= 0 ? '#0D7680' : '#CC0000'),
            borderWidth: 2
        }];
    } else {
        datasets = [
            {
                label: '매출 (억원)',
                data: [parseNum(company.rev22), parseNum(company.rev23), parseNum(company.rev24)],
                backgroundColor: 'rgba(153, 15, 61, 0.8)',
                borderColor: '#990F3D',
                borderWidth: 2,
                yAxisID: 'y'
            },
            {
                label: '영업이익 (억원)',
                data: [parseNum(company.profit22), parseNum(company.profit23), parseNum(company.profit24)],
                backgroundColor: 'rgba(13, 118, 128, 0.8)',
                borderColor: '#0D7680',
                borderWidth: 2,
                yAxisID: 'y1'
            }
        ];
    }

    companyChart = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: type === 'combined' } },
            scales: type === 'combined' ? {
                y: { type: 'linear', display: true, position: 'left', title: { display: true, text: '매출 (억원)' } },
                y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: '영업이익 (억원)' }, grid: { drawOnChartArea: false } }
            } : { y: { beginAtZero: type === 'revenue' } }
        }
    });
}

// Event Listeners
document.getElementById('searchInput').addEventListener('input', (e) => {
    searchTerm = e.target.value;
    currentPage = 1;
    renderTable();
});

document.getElementById('profitFilter').addEventListener('change', (e) => {
    profitFilter = e.target.value;
    currentPage = 1;
    renderTable();
});

document.getElementById('yearFilter').addEventListener('change', (e) => {
    yearFilter = e.target.value;
    currentPage = 1;
    renderTable();
});

document.getElementById('perPage').addEventListener('change', (e) => {
    perPage = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
    currentPage = 1;
    renderTable();
});

document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; renderTable(); }
});

document.getElementById('nextBtn').addEventListener('click', () => {
    currentPage++;
    renderTable();
});

document.querySelectorAll('th[data-column]').forEach(th => {
    th.addEventListener('click', () => {
        const column = th.dataset.column;
        if (sortColumn === column) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortColumn = column;
            sortDirection = column === 'name' ? 'asc' : 'desc';
        }
        renderTable();
    });
});

document.getElementById('tableBody').addEventListener('click', (e) => {
    if (e.target.classList.contains('company-name')) {
        showCompanyModal(e.target.dataset.company);
    }
});

document.getElementById('modalClose').addEventListener('click', () => {
    document.getElementById('modalOverlay').classList.remove('active');
});

document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalOverlay')) {
        document.getElementById('modalOverlay').classList.remove('active');
    }
});

document.querySelectorAll('.chart-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const companyName = document.getElementById('modalTitle').textContent;
        const company = financialData.find(c => c.name === companyName);
        if (company) renderCompanyChart(company, tab.dataset.chart);
    });
});

// Initialize
renderStats();
renderTable();

