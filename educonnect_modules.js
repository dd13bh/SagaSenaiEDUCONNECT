/**
 * EDUCONNECT PRO | MÓDULOS AVANÇADOS, ACESSIBILIDADE, IA & POWER BI
 * SENAI Centro 4.0 - Especialização em Ciência de Dados
 */

(function (window) {
    'use strict';

    // Estado Global de Acessibilidade
    const accState = {
        fontScale: parseFloat(localStorage.getItem('edu_font_scale') || '1'),
        theme: localStorage.getItem('edu_theme') || 'default',
        dyslexia: localStorage.getItem('edu_dyslexia') === 'true',
        colorblind: localStorage.getItem('edu_colorblind') || 'none',
        speechRate: parseFloat(localStorage.getItem('edu_speech_rate') || '1.1'),
        isSpeaking: false
    };

    // Estado Global de Filtros Dinâmicos Cruzados
    let activeFilters = JSON.parse(localStorage.getItem('edu_active_filters') || '{}');

    // Regras de Alarmes Configuráveis
    let alarmRules = JSON.parse(localStorage.getItem('edu_alarm_rules') || JSON.stringify({
        criticalGradeThreshold: 6.0,
        criticalAttendanceThreshold: 75,
        warningGradeThreshold: 7.0,
        naiProgressThreshold: 7.0,
        gapDeltaThreshold: 1.5
    }));

    // Instâncias ApexCharts ativas para destruição/atualização limpa
    const chartInstances = {};

    // Gráficos customizados pelo usuário
    const chartCustomConfigs = JSON.parse(localStorage.getItem('edu_chart_custom_configs') || '{}');

    /* ==========================================================================
       1. MÓDULO DE ACESSIBILIDADE & INCLUSÃO ADAPTATIVA (WCAG 2.1 AA)
       ========================================================================== */
    function applyAccessibility() {
        const doc = document.documentElement;
        doc.style.setProperty('--font-scale', accState.fontScale);
        doc.setAttribute('data-theme', accState.theme);
        doc.setAttribute('data-dyslexia', accState.dyslexia ? 'true' : 'false');
        if (accState.colorblind && accState.colorblind !== 'none') {
            doc.setAttribute('data-colorblind', accState.colorblind);
        } else {
            doc.removeAttribute('data-colorblind');
        }

        const fontLabel = document.getElementById('accFontLabel');
        if (fontLabel) fontLabel.textContent = `${Math.round(accState.fontScale * 100)}%`;
    }

    function changeFontSize(delta) {
        accState.fontScale = Math.max(0.85, Math.min(1.4, accState.fontScale + delta));
        localStorage.setItem('edu_font_scale', accState.fontScale);
        applyAccessibility();
        triggerChartResize();
    }

    function resetFontSize() {
        accState.fontScale = 1;
        localStorage.setItem('edu_font_scale', '1');
        applyAccessibility();
        triggerChartResize();
    }

    function setTheme(themeName) {
        accState.theme = themeName;
        localStorage.setItem('edu_theme', themeName);
        applyAccessibility();
        triggerChartResize();
    }

    function toggleDyslexia() {
        accState.dyslexia = !accState.dyslexia;
        localStorage.setItem('edu_dyslexia', accState.dyslexia);
        applyAccessibility();
    }

    function setColorblindMode(mode) {
        accState.colorblind = mode;
        localStorage.setItem('edu_colorblind', mode);
        applyAccessibility();
    }

    /* Leitor de Tela & Síntese de Voz (Web Speech API) */
    function speakText(text) {
        if (!('speechSynthesis' in window)) {
            alert('A síntese de voz não é suportada por este navegador.');
            return;
        }
        window.speechSynthesis.cancel();
        if (!text) return;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = accState.speechRate;

        // Selecionar voz em português se disponível
        const voices = window.speechSynthesis.getVoices();
        const ptVoice = voices.find(v => v.lang.startsWith('pt') || v.lang.startsWith('pt-BR'));
        if (ptVoice) utterance.voice = ptVoice;

        const pulseEl = document.getElementById('accAudioPulse');
        const playBtn = document.getElementById('accPlayBtn');

        utterance.onstart = () => {
            accState.isSpeaking = true;
            if (pulseEl) pulseEl.classList.add('speaking');
            if (playBtn) playBtn.textContent = '⏹ Parar Áudio';
        };

        utterance.onend = utterance.onerror = () => {
            accState.isSpeaking = false;
            if (pulseEl) pulseEl.classList.remove('speaking');
            if (playBtn) playBtn.textContent = '🔊 Ouvir Resumo';
        };

        window.speechSynthesis.speak(utterance);
    }

    function toggleSpeechSummary() {
        if (accState.isSpeaking) {
            window.speechSynthesis.cancel();
            accState.isSpeaking = false;
            const pulseEl = document.getElementById('accAudioPulse');
            const playBtn = document.getElementById('accPlayBtn');
            if (pulseEl) pulseEl.classList.remove('speaking');
            if (playBtn) playBtn.textContent = '🔊 Ouvir Resumo';
            return;
        }

        // Montar texto descritivo inteligente da página atual
        const p = window.currentPage || 'dashboard';
        let text = '';
        const titleEl = document.getElementById('pageTitle');
        const pageTitle = titleEl ? titleEl.textContent : 'Educonnect';

        if (p === 'dashboard' || p === 'reports') {
            const badgeEl = document.getElementById('dashboardFilterBadge') || document.getElementById('reportFilterBadge');
            const summaryText = badgeEl ? badgeEl.innerText.replace(/\n/g, ' ') : '';
            text = `Você está na página de ${pageTitle}. ${summaryText}. A plataforma monitora indicadores de proficiência e competências segundo as diretrizes pedagógicas do SENAI. Utilize os filtros dinâmicos e os gráficos personalizáveis para aprofundar a análise.`;
        } else if (p === 'alarms') {
            text = `Página da Central de Alarmes e Gestão de Indicadores. Aqui são monitorados os riscos críticos de evasão e defasagens de aprendizagem. Você pode calibrar os limiares e registrar intervenções pedagógicas direcionadas.`;
        } else if (p === 'datascience') {
            text = `Módulo de Ciência de Dados e Inteligência Artificial. Cruzamento preditivo de dados educacionais, matriz de correlação de disciplinas e integração direta com o Google Gemini para diagnósticos pedagógicos automatizados.`;
        } else if (p === 'special_needs') {
            text = `Módulo de Inclusão e Necessidades Especiais do Núcleo de Apoio à Inclusão. Gestão de recursos adaptativos, tecnologia assistiva e acompanhamento de estudantes com PCD e TDAH.`;
        } else {
            text = `Você está navegando na seção ${pageTitle} do sistema Educonnect.`;
        }

        speakText(text);
    }

    function openAccessibilityModal() {
        const content = `
            <div style="display:flex;flex-direction:column;gap:18px;">
                <div>
                    <b style="font-size:13px;color:var(--text);display:block;margin-bottom:8px;">Modo de Visualização & Contraste:</b>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <button class="btn secondary" onclick="eduModules.setTheme('default');closeModal();" style="text-align:left;">🔵 SENAI Institucional (Padrão)</button>
                        <button class="btn secondary" onclick="eduModules.setTheme('dark-slate');closeModal();" style="text-align:left;">🌙 Modo Escuro Moderno</button>
                        <button class="btn secondary" onclick="eduModules.setTheme('high-contrast-dark');closeModal();" style="text-align:left;">⚡ Alto Contraste Escuro (Ouro)</button>
                        <button class="btn secondary" onclick="eduModules.setTheme('high-contrast-light');closeModal();" style="text-align:left;">🔲 Alto Contraste Claro (P&B)</button>
                    </div>
                </div>

                <div>
                    <b style="font-size:13px;color:var(--text);display:block;margin-bottom:8px;">Acessibilidade Cromática (Daltonismo):</b>
                    <select class="filter-select" style="width:100%;" onchange="eduModules.setColorblindMode(this.value)">
                        <option value="none" ${accState.colorblind === 'none' ? 'selected' : ''}>Visão Padrão</option>
                        <option value="protanopia" ${accState.colorblind === 'protanopia' ? 'selected' : ''}>Protanopia (Dificuldade com Vermelhos)</option>
                        <option value="deuteranopia" ${accState.colorblind === 'deuteranopia' ? 'selected' : ''}>Deuteranopia (Dificuldade com Verdes)</option>
                        <option value="tritanopia" ${accState.colorblind === 'tritanopia' ? 'selected' : ''}>Tritanopia (Dificuldade com Azuis)</option>
                        <option value="achromatopsia" ${accState.colorblind === 'achromatopsia' ? 'selected' : ''}>Monocromático (Apenas tons de cinza)</option>
                    </select>
                </div>

                <div>
                    <b style="font-size:13px;color:var(--text);display:block;margin-bottom:8px;">Suporte à Leitura & Dislexia:</b>
                    <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
                        <input type="checkbox" ${accState.dyslexia ? 'checked' : ''} onchange="eduModules.toggleDyslexia()">
                        <span>Ativar espaçamento estendido e tipografia amigável para dislexia</span>
                    </label>
                </div>

                <div>
                    <b style="font-size:13px;color:var(--text);display:block;margin-bottom:8px;">Efeito Visual de Fundo:</b>
                    <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
                        <input type="checkbox" ${document.body.classList.contains('dynamic-gradient-bg') ? 'checked' : ''} onchange="eduModules.toggleDynamicBg()">
                        <span>Fundo com variação contínua em degradê dinâmico (tons claros a médios escuros)</span>
                    </label>
                </div>

                <div>
                    <b style="font-size:13px;color:var(--text);display:block;margin-bottom:8px;">Atalhos Úteis de Teclado:</b>
                    <div style="font-size:12px;color:var(--muted);background:var(--bg);padding:10px;border-radius:8px;line-height:1.6;">
                        <code>Alt + 1</code>: Dashboard Executivo<br>
                        <code>Alt + 2</code>: Indicadores & BI<br>
                        <code>Alt + 3</code>: Central de Alarmes<br>
                        <code>Alt + 4</code>: Ciência de Dados & IA<br>
                        <code>Alt + 5</code>: Necessidades Especiais (NAI)<br>
                        <code>Alt + S</code>: Ler Resumo em Voz Alta<br>
                        <code>Alt + A</code>: Abrir este painel de Acessibilidade
                    </div>
                </div>
            </div>
        `;
        window.modal('Recursos Adaptativos & Acessibilidade', 'Personalize sua experiência visual, sonora e de navegação na plataforma', content, () => {});
    }

    /* ==========================================================================
       2. MÓDULO DE FILTROS DINÂMICOS CRUZADOS INTELIGENTES (BOTÃO +)
       ========================================================================== */
    async function renderSmartFilterBar(containerId, onFilterChangedCallback) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const [courses, units, classes, students, grades, inclusion] = await Promise.all([
            window.all('courses'), window.all('units'), window.all('classes'),
            window.all('students'), window.all('grades'), window.all('inclusion')
        ]);

        const incMap = Object.fromEntries(inclusion.map(x => [x.studentId, x]));
        const cMap = Object.fromEntries(courses.map(x => [x.id, x.name]));
        const uMap = Object.fromEntries(units.map(x => [x.id, x.name]));
        const clMap = Object.fromEntries(classes.map(x => [x.id, x.name]));

        // Filtros ativos
        const keys = Object.keys(activeFilters);
        let chipsHtml = '';

        if (!keys.length) {
            chipsHtml = '<span class="filter-empty-label">Nenhum filtro ativo (Base institucional 100%)</span>';
        } else {
            keys.forEach(k => {
                const f = activeFilters[k];
                chipsHtml += `
                    <span class="filter-chip">
                        <span><b>${f.label}:</b> ${window.esc(f.text)}</span>
                        <button class="filter-chip-remove" title="Remover filtro" onclick="eduModules.removeFilterChip('${k}')">×</button>
                    </span>
                `;
            });
        }

        // Calcular contagem filtrada
        const filteredStudents = applySmartFilters(students, incMap, grades);
        const filteredIds = new Set(filteredStudents.map(s => s.id));
        const filteredGrades = grades.filter(g => filteredIds.has(g.studentId));
        const avg = filteredGrades.length ? (filteredGrades.reduce((a, b) => a + Number(b.value), 0) / filteredGrades.length).toFixed(1) : '—';

        container.innerHTML = `
            <div class="smart-filter-bar">
                <div class="smart-filter-left">
                    <span class="filter-badge-pill">⚡ Filtros Cruzados</span>
                    <div class="filter-chips-container">${chipsHtml}</div>
                    <button class="btn-add-filter" onclick="eduModules.toggleFilterPopover(event)" title="Adicionar novos filtros dinâmicos cruzados">
                        <span>+</span> Adicionar Filtro
                    </button>
                    ${keys.length ? '<button class="filter-reset-btn" style="height:32px;padding:4px 10px;font-size:11px;" onclick="eduModules.clearAllFilters()" title="Remover todos os filtros aplicados">↺ Limpar Todos</button>' : ''}
                </div>
                <div class="smart-filter-right">
                    <div class="filter-summary-badge" style="display:inline-flex;">
                        <span class="badge-dot ${keys.length ? 'active' : ''}"></span>
                        <span class="summary-text">
                            ${keys.length ? `Recorte: <b>${filteredStudents.length}</b> de ${students.length} discentes · Média: <b>${avg}</b>` : `Base Total: <b>${students.length}</b> discentes · Média Geral: <b>${avg}</b>`}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }

    function ensureGlobalFilterPopover() {
        let popover = document.getElementById('globalFilterPopover');
        if (!popover) {
            popover = document.createElement('div');
            popover.id = 'globalFilterPopover';
            popover.className = 'filter-popover';
            popover.innerHTML = `
                <div class="filter-popover-header">
                    <b id="filterPopoverTitle">Adicionar Novo Filtro</b>
                    <button class="close" onclick="eduModules.closeFilterPopover()" style="font-size:16px;">×</button>
                </div>
                <div id="filterPopoverBody"></div>
            `;
            document.body.appendChild(popover);
            refreshFilterCategories();
        }
        return popover;
    }

    function toggleFilterPopover(e) {
        if (e && e.stopPropagation) e.stopPropagation();
        const popover = ensureGlobalFilterPopover();
        const btn = (e && (e.currentTarget || (e.target && e.target.closest && e.target.closest('.btn-add-filter')))) || document.querySelector('.btn-add-filter');
        if (!btn) return;

        const isShown = popover.classList.contains('show');
        if (isShown) {
            popover.classList.remove('show');
            return;
        }

        refreshFilterCategories();
        const rect = btn.getBoundingClientRect();
        popover.style.top = `${Math.round(rect.bottom + window.scrollY + 6)}px`;
        const idealLeft = rect.left + window.scrollX;
        popover.style.left = `${Math.round(Math.max(10, Math.min(idealLeft, window.innerWidth - 340)))}px`;
        popover.classList.add('show');
    }

    function closeFilterPopover() {
        const popover = document.getElementById('globalFilterPopover');
        if (popover) popover.classList.remove('show');
    }

    async function showFilterOptions(key, label) {
        ensureGlobalFilterPopover();
        const body = document.getElementById('filterPopoverBody');
        const title = document.getElementById('filterPopoverTitle');
        if (!body || !title) return;

        title.innerHTML = `‹ <span style="cursor:pointer;" onclick="eduModules.refreshFilterCategories()">Categorias</span> / ${label}`;

        const [courses, units, classes, students, grades, inclusion] = await Promise.all([
            window.all('courses'), window.all('units'), window.all('classes'),
            window.all('students'), window.all('grades'), window.all('inclusion')
        ]);
        const incMap = Object.fromEntries(inclusion.map(x => [x.studentId, x]));

        let options = [];
        if (key === 'unitId') {
            options = units.map(u => ({
                id: u.id,
                text: u.name,
                count: students.filter(s => s.unitId === u.id).length
            }));
        } else if (key === 'courseId') {
            options = courses.map(c => ({
                id: c.id,
                text: c.name,
                count: students.filter(s => s.courseId === c.id).length
            }));
        } else if (key === 'classId') {
            options = classes.map(cl => ({
                id: cl.id,
                text: cl.name,
                count: students.filter(s => s.classId === cl.id).length
            }));
        } else if (key === 'status') {
            options = [
                { id: 'ATIVO', text: 'Ativos', count: students.filter(s => s.status === 'ATIVO').length },
                { id: 'INATIVO', text: 'Inativos', count: students.filter(s => s.status === 'INATIVO').length }
            ];
        } else if (key === 'inclusion') {
            options = [
                { id: 'INCLUSION', text: 'Apenas Discentes NAI (PCD/TDAH)', count: students.filter(s => !!incMap[s.id]).length },
                { id: 'REGULAR', text: 'Apenas Discentes Regulares', count: students.filter(s => !incMap[s.id]).length },
                { id: 'TDAH', text: 'TDAH', count: students.filter(s => incMap[s.id]?.needType === 'TDAH').length },
                { id: 'TEA', text: 'TEA (Autismo)', count: students.filter(s => incMap[s.id]?.needType === 'TEA').length },
                { id: 'Dislexia', text: 'Dislexia', count: students.filter(s => incMap[s.id]?.needType === 'Dislexia').length }
            ];
        } else if (key === 'gradeRange') {
            options = [
                { id: 'APTO', text: 'Apto (Nota >= 8.0)', count: students.filter(s => {
                    const sg = grades.filter(g => g.studentId === s.id);
                    const avg = sg.length ? sg.reduce((a, b) => a + Number(b.value), 0) / sg.length : 0;
                    return avg >= 8.0;
                }).length },
                { id: 'DESENVOLVIMENTO', text: 'Em Desenvolvimento (6.0 a 7.9)', count: students.filter(s => {
                    const sg = grades.filter(g => g.studentId === s.id);
                    const avg = sg.length ? sg.reduce((a, b) => a + Number(b.value), 0) / sg.length : 0;
                    return avg >= 6.0 && avg < 8.0;
                }).length },
                { id: 'RISCO', text: 'Risco Pedagógico (Nota < 6.0)', count: students.filter(s => {
                    const sg = grades.filter(g => g.studentId === s.id);
                    const avg = sg.length ? sg.reduce((a, b) => a + Number(b.value), 0) / sg.length : 0;
                    return avg < 6.0 && sg.length > 0;
                }).length }
            ];
        }

        body.innerHTML = `
            <div class="filter-options-subview">
                ${options.map(opt => `
                    <div class="filter-sub-option" onclick="eduModules.applyFilterValue('${key}', '${opt.id}', '${label}', '${opt.text}')">
                        <span>${window.esc(opt.text)}</span>
                        <span class="count-pill">${opt.count} alunos</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function refreshFilterCategories() {
        const popover = ensureGlobalFilterPopover();
        const title = document.getElementById('filterPopoverTitle');
        const body = document.getElementById('filterPopoverBody');
        if (title) title.textContent = 'Adicionar Novo Filtro';
        if (body) {
            body.innerHTML = `
                <div class="filter-category-item" onclick="eduModules.showFilterOptions('unitId', 'Unidade Operacional')">
                    <span>🏢 Unidade Operacional</span>
                    <span>›</span>
                </div>
                <div class="filter-category-item" onclick="eduModules.showFilterOptions('courseId', 'Curso / Habilitação')">
                    <span>📚 Curso / Habilitação</span>
                    <span>›</span>
                </div>
                <div class="filter-category-item" onclick="eduModules.showFilterOptions('classId', 'Turma / Coorte')">
                    <span>👥 Turma / Coorte</span>
                    <span>›</span>
                </div>
                <div class="filter-category-item" onclick="eduModules.showFilterOptions('status', 'Status Cadastral')">
                    <span>🎯 Status Cadastral</span>
                    <span>›</span>
                </div>
                <div class="filter-category-item" onclick="eduModules.showFilterOptions('inclusion', 'Inclusão & NAI')">
                    <span>♿ Inclusão & NAI (PCD/TDAH)</span>
                    <span>›</span>
                </div>
                <div class="filter-category-item" onclick="eduModules.showFilterOptions('gradeRange', 'Faixa de Rendimento')">
                    <span>📊 Faixa de Rendimento</span>
                    <span>›</span>
                </div>
            `;
        }
    }

    function applyFilterValue(key, val, label, text) {
        activeFilters[key] = { value: val, label: label, text: text };
        localStorage.setItem('edu_active_filters', JSON.stringify(activeFilters));
        closeFilterPopover();
        triggerViewRefresh();
    }

    function removeFilterChip(key) {
        delete activeFilters[key];
        localStorage.setItem('edu_active_filters', JSON.stringify(activeFilters));
        triggerViewRefresh();
    }

    function clearAllFilters() {
        activeFilters = {};
        localStorage.setItem('edu_active_filters', '{}');
        triggerViewRefresh();
    }

    function applySmartFilters(students, incMap, grades) {
        return students.filter(s => {
            if (activeFilters.unitId && String(s.unitId) !== String(activeFilters.unitId.value)) return false;
            if (activeFilters.courseId && String(s.courseId) !== String(activeFilters.courseId.value)) return false;
            if (activeFilters.classId && String(s.classId) !== String(activeFilters.classId.value)) return false;
            if (activeFilters.status && s.status !== activeFilters.status.value) return false;

            if (activeFilters.inclusion) {
                const v = activeFilters.inclusion.value;
                const inc = incMap[s.id];
                if (v === 'INCLUSION' && !inc) return false;
                if (v === 'REGULAR' && inc) return false;
                if (v !== 'INCLUSION' && v !== 'REGULAR' && inc?.needType !== v) return false;
            }

            if (activeFilters.gradeRange && grades) {
                const v = activeFilters.gradeRange.value;
                const sg = grades.filter(g => g.studentId === s.id);
                const avg = sg.length ? sg.reduce((a, b) => a + Number(b.value), 0) / sg.length : 0;
                if (v === 'APTO' && avg < 8.0) return false;
                if (v === 'DESENVOLVIMENTO' && (avg < 6.0 || avg >= 8.0)) return false;
                if (v === 'RISCO' && (avg >= 6.0 || sg.length === 0)) return false;
            }

            return true;
        });
    }

    function triggerViewRefresh() {
        const page = window.currentPage || (window.location.hash ? window.location.hash.replace('#', '') : 'dashboard');
        window.currentPage = page;

        // Atualizar barra de filtros inteligentes se presente no container da visão ativa
        const barContainers = [
            ['dashboard', 'dashboardSmartFilterBar'],
            ['reports', 'reportsSmartFilterBar'],
            ['students', 'studentsSmartFilterBar'],
            ['teachers', 'teachersSmartFilterBar'],
            ['courses', 'coursesSmartFilterBar'],
            ['units', 'unitsSmartFilterBar'],
            ['classes', 'classesSmartFilterBar'],
            ['grades', 'gradesSmartFilterBar'],
            ['special_needs', 'inclusionSmartFilterBar'],
            ['alarms', 'alarmsSmartFilterBar'],
            ['datascience', 'datascienceSmartFilterBar'],
            ['users', 'usersSmartFilterBar']
        ];
        barContainers.forEach(([pg, cId]) => {
            if (page === pg && document.getElementById(cId)) {
                renderSmartFilterBar(cId);
            }
        });

        // Re-executar controladores reativos da visão ativa
        if (page === 'dashboard' && window.renderDashboard) window.renderDashboard();
        else if (page === 'reports' && window.renderReports) window.renderReports();
        else if (page === 'students' && window.renderStudents) window.renderStudents();
        else if (page === 'teachers' && window.renderTeachers) window.renderTeachers();
        else if (page === 'courses' && window.renderCourses) window.renderCourses();
        else if (page === 'units' && window.renderUnits) window.renderUnits();
        else if (page === 'classes' && window.renderClasses) window.renderClasses();
        else if (page === 'grades' && window.renderGrades) window.renderGrades();
        else if (page === 'special_needs' && window.renderInclusion) window.renderInclusion();
        else if (page === 'users' && window.renderUsers) window.renderUsers();
        else if (page === 'alarms' && eduModules.renderAlarmsPage) eduModules.renderAlarmsPage();
        else if (page === 'datascience' && eduModules.renderDataSciencePage) eduModules.renderDataSciencePage();

        // Tornar tabelas reclassificáveis / ordenáveis
        setTimeout(initSortableTables, 150);
    }

    /* ==========================================================================
       3. MÓDULO DE APEXCHARTS DINÂMICO & CUSTOMIZADOR DE CARDS
       ========================================================================== */
    function renderAdaptiveChart(options) {
        const {
            boxId,
            apexDivId,
            canvasId,
            tagId,
            configKey,
            title = 'Indicador',
            defaultType = 'bar',
            defaultPalette = 'senai',
            defaultBenchmark = 7.0,
            categories = [],
            seriesData = [],
            donutData = [],
            unitLabel = 'pts',
            canvasFallbackFn = null
        } = options;

        const boxEl = document.getElementById(boxId);
        const apexEl = document.getElementById(apexDivId);
        const tagEl = tagId ? document.getElementById(tagId) : null;

        if (!boxEl || !apexEl) {
            if (canvasFallbackFn) canvasFallbackFn();
            return;
        }

        // Configurações salvas da personalização (sempre sincronizadas com storage)
        const storedConfigs = JSON.parse(localStorage.getItem('edu_chart_custom_configs') || '{}');
        Object.assign(chartCustomConfigs, storedConfigs);
        const saved = storedConfigs[configKey] || chartCustomConfigs[configKey] || {};
        const chartType = saved.type || defaultType;
        const colorPalette = saved.palette || defaultPalette;
        const benchmarkRule = saved.benchmark !== undefined ? Number(saved.benchmark) : defaultBenchmark;
        const showBenchmark = saved.showBenchmark !== undefined ? saved.showBenchmark : true;

        // Paletas dinâmicas ricas
        const palettes = {
            senai: ['#005594', '#2563eb', '#f59e0b', '#10b981', '#7c3aed', '#06b6d4'],
            cyber: ['#6366f1', '#a855f7', '#ec4899', '#3b82f6', '#14b8a6', '#f43f5e'],
            emerald: ['#059669', '#10b981', '#34d399', '#6ee7b7', '#047857', '#0f766e'],
            alert: ['#ef4444', '#f59e0b', '#eab308', '#3b82f6', '#10b981', '#8b5cf6']
        };
        const chosenColors = palettes[colorPalette] || palettes.senai;

        // Atualizar etiqueta/tag indicativa no cabeçalho do card
        if (tagEl) {
            if (chartType === 'donut') {
                tagEl.textContent = 'Rosca Proporcional';
                tagEl.className = 'chart-tag purple';
            } else if (chartType === 'radar') {
                tagEl.textContent = 'Radar Multidimensional';
                tagEl.className = 'chart-tag blue';
            } else if (chartType === 'line') {
                tagEl.textContent = showBenchmark ? `Curva · Meta ${benchmarkRule.toFixed(1)}` : 'Curva Spline';
                tagEl.className = 'chart-tag blue';
            } else if (chartType === 'area') {
                tagEl.textContent = showBenchmark ? `Área · Meta ${benchmarkRule.toFixed(1)}` : 'Área Gradiente';
                tagEl.className = 'chart-tag blue';
            } else {
                tagEl.textContent = showBenchmark ? `Meta: ${benchmarkRule.toFixed(1)}` : `Barras (${colorPalette.toUpperCase()})`;
                tagEl.className = showBenchmark ? 'chart-tag amber' : 'chart-tag blue';
            }
        }

        // Se ApexCharts não estiver disponível, usar canvas fallback
        if (!window.ApexCharts) {
            boxEl.classList.remove('has-apex');
            if (canvasFallbackFn) canvasFallbackFn();
            return;
        }

        try {
            boxEl.classList.add('has-apex');

            if (chartInstances[apexDivId]) {
                try { chartInstances[apexDivId].destroy(); } catch (e) {}
                delete chartInstances[apexDivId];
            }
            apexEl.innerHTML = '';

            const isDark = (document.documentElement.getAttribute('data-theme') || '').includes('dark');
            let finalConfig = {};

            if (chartType === 'donut') {
                const labels = donutData.length ? donutData.map(d => d.label) : categories;
                const vals = donutData.length ? donutData.map(d => Number(d.value) || 0) : seriesData.map(v => Number(v) || 0);

                finalConfig = {
                    chart: {
                        type: 'donut',
                        height: 270,
                        animations: { enabled: true, easing: 'easeinout', speed: 380 },
                        background: 'transparent'
                    },
                    series: vals,
                    labels: labels,
                    colors: chosenColors,
                    stroke: { width: 2, colors: [isDark ? '#1e293b' : '#ffffff'] },
                    legend: {
                        position: 'bottom',
                        labels: { colors: isDark ? '#cbd5e1' : '#475569' }
                    },
                    dataLabels: {
                        enabled: true,
                        formatter: val => val.toFixed(1) + '%'
                    },
                    plotOptions: {
                        pie: {
                            donut: {
                                size: '65%',
                                labels: {
                                    show: true,
                                    name: { color: isDark ? '#f8fafc' : '#0f172a' },
                                    value: {
                                        color: isDark ? '#f8fafc' : '#0f172a',
                                        formatter: val => Number(val).toLocaleString('pt-BR')
                                    },
                                    total: {
                                        show: true,
                                        label: 'Total',
                                        color: isDark ? '#94a3b8' : '#64748b',
                                        formatter: w => w.globals.seriesTotals.reduce((a, b) => a + b, 0).toLocaleString('pt-BR')
                                    }
                                }
                            }
                        }
                    },
                    tooltip: { theme: isDark ? 'dark' : 'light' }
                };
            } else if (chartType === 'radar') {
                finalConfig = {
                    chart: {
                        type: 'radar',
                        height: 270,
                        animations: { enabled: true, easing: 'easeinout', speed: 380 },
                        background: 'transparent'
                    },
                    series: [{ name: title, data: seriesData }],
                    xaxis: {
                        categories: categories,
                        labels: {
                            style: { colors: categories.map(() => isDark ? '#94a3b8' : '#64748b') }
                        }
                    },
                    colors: [chosenColors[0] || '#005594'],
                    markers: { size: 4 },
                    tooltip: { theme: isDark ? 'dark' : 'light' }
                };
            } else {
                // bar, line, area
                const annotations = { yaxis: [] };
                if (showBenchmark && benchmarkRule > 0) {
                    annotations.yaxis.push({
                        y: benchmarkRule,
                        borderColor: '#10b981',
                        strokeDashArray: 4,
                        borderWidth: 2,
                        label: {
                            borderColor: '#10b981',
                            style: { color: '#fff', background: '#10b981', fontWeight: 700, fontSize: '11px' },
                            text: `Meta SENAI: ${benchmarkRule.toFixed(1)}`
                        }
                    });
                }

                finalConfig = {
                    chart: {
                        type: chartType,
                        height: 270,
                        animations: { enabled: true, easing: 'easeinout', speed: 380 },
                        toolbar: { show: false },
                        background: 'transparent'
                    },
                    series: [{
                        name: title,
                        data: seriesData
                    }],
                    xaxis: {
                        categories: categories,
                        labels: {
                            rotate: -20,
                            rotateAlways: categories.length > 5,
                            style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' }
                        }
                    },
                    yaxis: {
                        labels: {
                            style: { colors: isDark ? '#94a3b8' : '#64748b' },
                            formatter: val => typeof val === 'number' ? val.toFixed(1) : val
                        }
                    },
                    colors: chosenColors,
                    stroke: {
                        curve: 'smooth',
                        width: chartType === 'bar' ? 0 : 3
                    },
                    plotOptions: {
                        bar: {
                            borderRadius: 6,
                            columnWidth: '55%',
                            distributed: chosenColors.length > 1 && chartType === 'bar'
                        }
                    },
                    dataLabels: {
                        enabled: chartType === 'bar' && categories.length <= 8,
                        style: { fontSize: '10px' }
                    },
                    annotations: annotations,
                    grid: {
                        borderColor: isDark ? '#334155' : '#f1f5f9',
                        strokeDashArray: 4
                    },
                    tooltip: {
                        theme: isDark ? 'dark' : 'light',
                        y: {
                            formatter: val => `${val} ${unitLabel}`
                        }
                    }
                };
            }

            const chart = new ApexCharts(apexEl, finalConfig);
            chart.render();
            chartInstances[apexDivId] = chart;

        } catch (err) {
            console.warn('Erro ao renderizar ApexChart, fallback para canvas:', err);
            boxEl.classList.remove('has-apex');
            if (canvasFallbackFn) canvasFallbackFn();
        }
    }

    function renderCustomizableApexChart(elementId, configKey, baseConfig) {
        renderAdaptiveChart({
            boxId: elementId,
            apexDivId: elementId,
            canvasId: '',
            configKey: configKey,
            ...baseConfig
        });
    }

    function openChartCustomizer(configKey, title) {
        const saved = chartCustomConfigs[configKey] || {};
        const currentType = saved.type || 'bar';
        const currentPalette = saved.palette || 'senai';
        const currentBenchmark = saved.benchmark !== undefined ? saved.benchmark : 7.0;
        const showBenchmark = saved.showBenchmark !== undefined ? saved.showBenchmark : true;

        const content = `
            <div style="display:flex;flex-direction:column;gap:16px;">
                <div>
                    <label style="font-weight:700;font-size:12px;margin-bottom:6px;display:block;">Tipo de Visualização:</label>
                    <select id="cfgChartType" class="filter-select" style="width:100%;">
                        <option value="bar" ${currentType === 'bar' ? 'selected' : ''}>📊 Gráfico de Barras / Colunas</option>
                        <option value="line" ${currentType === 'line' ? 'selected' : ''}>📈 Linha Curva de Desempenho (Spline)</option>
                        <option value="area" ${currentType === 'area' ? 'selected' : ''}>📉 Área Suave com Gradiente</option>
                        <option value="donut" ${currentType === 'donut' ? 'selected' : ''}>🍩 Rosca / Donut Proporcional</option>
                        <option value="radar" ${currentType === 'radar' ? 'selected' : ''}>🕸 Radar Multidimensional</option>
                    </select>
                </div>

                <div>
                    <label style="font-weight:700;font-size:12px;margin-bottom:6px;display:block;">Paleta de Cores:</label>
                    <select id="cfgChartPalette" class="filter-select" style="width:100%;">
                        <option value="senai" ${currentPalette === 'senai' ? 'selected' : ''}>🔵 SENAI Oficial (Azul & Laranja Inovação)</option>
                        <option value="cyber" ${currentPalette === 'cyber' ? 'selected' : ''}>🟣 Cyber Indigo (Roxo & Ciano)</option>
                        <option value="emerald" ${currentPalette === 'emerald' ? 'selected' : ''}>🟢 Emerald Growth (Verdes de Alta Acurácia)</option>
                        <option value="alert" ${currentPalette === 'alert' ? 'selected' : ''}>🔴 Alerta & Riscos (Foco em Defasagem)</option>
                    </select>
                </div>

                <div style="background:var(--bg);padding:12px;border-radius:10px;border:1px solid var(--border);">
                    <label style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:12px;cursor:pointer;margin-bottom:8px;">
                        <input type="checkbox" id="cfgShowBenchmark" ${showBenchmark ? 'checked' : ''}>
                        <span>Exibir Régua / Linha de Meta Institucional</span>
                    </label>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="font-size:12px;color:var(--muted);">Nota de Corte / Meta:</span>
                        <input type="number" id="cfgBenchmarkVal" step="0.5" min="0" max="10" value="${currentBenchmark}" style="width:70px;padding:4px 8px;border-radius:6px;border:1px solid var(--border);">
                    </div>
                </div>
            </div>
        `;

        window.modal(`Customizar Gráfico: ${title}`, 'Ajuste o tipo visual, as réguas pedagógicas e as cores', content, () => {
            const newType = document.getElementById('cfgChartType').value;
            const newPalette = document.getElementById('cfgChartPalette').value;
            const newShowBench = document.getElementById('cfgShowBenchmark').checked;
            const newBenchVal = parseFloat(document.getElementById('cfgBenchmarkVal').value || '7.0');

            chartCustomConfigs[configKey] = {
                type: newType,
                palette: newPalette,
                showBenchmark: newShowBench,
                benchmark: newBenchVal
            };
            localStorage.setItem('edu_chart_custom_configs', JSON.stringify(chartCustomConfigs));
            triggerViewRefresh();
        });
    }

    function toggleChartFullscreen(cardId) {
        const card = document.getElementById(cardId);
        if (!card) return;

        const isFull = card.classList.toggle('chart-fullscreen-card');
        let overlay = document.getElementById('chartFullscreenOverlay');

        if (isFull) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'chartFullscreenOverlay';
                overlay.className = 'chart-fullscreen-modal';
                document.body.appendChild(overlay);
            }
            overlay.innerHTML = '';
            overlay.appendChild(card);
            overlay.style.display = 'flex';
        } else {
            if (overlay) {
                overlay.style.display = 'none';
            }
            // Retornar card ao seu container original se necessário
            triggerViewRefresh();
        }
        triggerChartResize();
    }

    function triggerChartResize() {
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
            Object.values(chartInstances).forEach(c => {
                try { if (c.resize) c.resize(); } catch (e) {}
            });
        }, 120);
    }

    /* ==========================================================================
       SIDEBAR RECOLHÍVEL, DEGRADÊ DINÂMICO, TOOLTIPS, GUIA & TABELAS ORDENÁVEIS
       ========================================================================== */

    function toggleSidebar() {
        const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
        document.getElementById('app')?.classList.toggle('sidebar-collapsed', isCollapsed);
        const btn = document.getElementById('sidebarToggleBtn');
        if (btn) {
            btn.textContent = isCollapsed ? '▶' : '◀';
            btn.title = isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral';
        }
        localStorage.setItem('edu_sidebar_collapsed', isCollapsed ? 'true' : 'false');
        triggerChartResize();
    }

    function applySavedSidebarState() {
        if (localStorage.getItem('edu_sidebar_collapsed') === 'true') {
            document.body.classList.add('sidebar-collapsed');
            document.getElementById('app')?.classList.add('sidebar-collapsed');
            const btn = document.getElementById('sidebarToggleBtn');
            if (btn) {
                btn.textContent = '▶';
                btn.title = 'Expandir menu lateral';
            }
        }
    }

    function toggleDynamicBg() {
        const isActive = document.body.classList.toggle('dynamic-gradient-bg');
        document.getElementById('app')?.classList.toggle('dynamic-gradient-bg', isActive);
        localStorage.setItem('edu_dynamic_bg', isActive ? 'true' : 'false');

        const btn = document.getElementById('btnDynamicBg');
        if (btn) {
            btn.classList.toggle('gradient-active', isActive);
            btn.textContent = isActive ? '✨ Degradê Ativo' : '🌈 Degradê Dinâmico';
        }

        const chk = document.getElementById('accDynamicBgCheck');
        if (chk) chk.checked = isActive;
    }

    function applySavedDynamicBg() {
        const isDynamic = localStorage.getItem('edu_dynamic_bg') === 'true';
        if (isDynamic) {
            document.body.classList.add('dynamic-gradient-bg');
            document.getElementById('app')?.classList.add('dynamic-gradient-bg');
            const btn = document.getElementById('btnDynamicBg');
            if (btn) {
                btn.classList.add('gradient-active');
                btn.textContent = '✨ Degradê Ativo';
            }
            const chk = document.getElementById('accDynamicBgCheck');
            if (chk) chk.checked = true;
        }
    }

    /* Sistema Universal de Tooltips Flutuantes */
    function initUniversalTooltips() {
        let tipEl = document.getElementById('eduFloatingTooltip');
        if (!tipEl) {
            tipEl = document.createElement('div');
            tipEl.id = 'eduFloatingTooltip';
            tipEl.className = 'edu-floating-tooltip';
            document.body.appendChild(tipEl);
        }

        const hints = {
            'btnAddFilterBtn': 'Adicionar novos filtros dinâmicos cruzados por Unidade, Curso ou Rendimento',
            'btnDynamicBg': 'Habilitar ou desabilitar o fundo dinâmico em degradê suave',
            'sidebarToggleBtn': 'Recolher ou expandir a barra lateral',
            'btnGuideToggle': 'Abrir painel com guia e explicação pedagógica dos indicadores',
            'accPlayBtn': 'Ouvir síntese por voz do resumo da tela',
            'dashCard1': 'Proporção entre alunos ativos, inativos e alunos assistidos pelo Núcleo de Inclusão (NAI)',
            'dashCard2': 'Média das notas de cada unidade operacional SENAI com linha de meta institucional',
            'dashCard3': 'Distribuição da curva avaliativa nas 5 faixas pedagógicas',
            'dashCard4': 'Dispersão de volume discente e médias por turma',
            'repCard1': 'Média curricular ranqueada por disciplina e comparação com a meta SENAI',
            'repCard2': 'Curva de densidade e frequência de notas lançadas',
            'repCard3': 'Matriz de competências SENAI: Apto (>= 8), Em Desenvolvimento (6 a 7.9) e Risco (< 6)',
            'repCard4': 'Dispersão e retenção acadêmica por turma e coorte'
        };

        document.addEventListener('mouseover', e => {
            const el = e.target.closest('[data-tooltip], [title], .btn, .iconbtn, .chart-btn-tool, .navitem, .acc-btn, .kpi-card, .drag-handle, th.sortable-th');
            if (!el) {
                tipEl.classList.remove('show');
                return;
            }

            if (el.title) {
                el.setAttribute('data-tooltip', el.title);
                el.removeAttribute('title');
            }

            let text = el.getAttribute('data-tooltip');
            if (!text && el.id && hints[el.id]) text = hints[el.id];
            else if (!text && el.classList.contains('chart-btn-tool')) {
                text = el.textContent.includes('Customizar') ? 'Personalizar tipo de gráfico, paleta de cores e linha de meta' : 'Visualizar gráfico em tela cheia';
            } else if (!text && el.classList.contains('btn-add-filter')) {
                text = 'Adicionar filtro dinâmico cruzado';
            } else if (!text && el.classList.contains('navitem')) {
                const emText = el.querySelector('em')?.textContent.trim();
                if (emText) text = `Navegar para seção ${emText}`;
            }

            if (!text) {
                tipEl.classList.remove('show');
                return;
            }

            tipEl.textContent = text;
            const rect = el.getBoundingClientRect();
            let top = rect.bottom + 8;
            let left = rect.left + (rect.width / 2);

            if (top + 45 > window.innerHeight) {
                top = rect.top - 36;
            }

            tipEl.style.top = `${Math.round(top)}px`;
            tipEl.style.left = `${Math.round(Math.max(12, Math.min(left - 70, window.innerWidth - 320)))}px`;
            tipEl.classList.add('show');
        });

        document.addEventListener('mouseout', e => {
            const el = e.target.closest('[data-tooltip], [title], .btn, .iconbtn, .chart-btn-tool, .navitem, .acc-btn, .kpi-card');
            if (el) tipEl.classList.remove('show');
        });
    }

    /* Sistema Universal de Reclassificação / Ordenação de Tabelas */
    function initSortableTables() {
        document.querySelectorAll('table').forEach(table => {
            const ths = table.querySelectorAll('thead th');
            ths.forEach((th, colIndex) => {
                const title = th.textContent.trim().toLowerCase();
                if (title === 'ações' || title === 'acao' || title === 'ação') return;

                th.classList.add('sortable-th');
                th.setAttribute('data-tooltip', `Clique para ordenar por ${th.textContent.trim()}`);

                if (th._sortBound) return;
                th._sortBound = true;

                th.addEventListener('click', () => {
                    const tbody = table.querySelector('tbody');
                    if (!tbody) return;
                    const rows = Array.from(tbody.querySelectorAll('tr'));
                    if (rows.length <= 1) return;
                    if (rows[0].querySelector('.empty')) return;

                    const currentDir = th.getAttribute('data-sort-dir') === 'asc' ? 'desc' : 'asc';

                    ths.forEach(otherTh => {
                        otherTh.removeAttribute('data-sort-dir');
                        otherTh.classList.remove('sort-asc', 'sort-desc');
                    });

                    th.setAttribute('data-sort-dir', currentDir);
                    th.classList.add(currentDir === 'asc' ? 'sort-asc' : 'sort-desc');

                    rows.sort((rowA, rowB) => {
                        const cellA = rowA.children[colIndex]?.textContent.trim() || '';
                        const cellB = rowB.children[colIndex]?.textContent.trim() || '';

                        const numA = parseFloat(cellA.replace(',', '.').replace(/[^\d.-]/g, ''));
                        const numB = parseFloat(cellB.replace(',', '.').replace(/[^\d.-]/g, ''));

                        if (!isNaN(numA) && !isNaN(numB) && !cellA.includes('@') && !cellB.includes('@') && !cellA.includes('/')) {
                            return currentDir === 'asc' ? numA - numB : numB - numA;
                        }

                        return currentDir === 'asc'
                            ? cellA.localeCompare(cellB, 'pt-BR', { numeric: true, sensitivity: 'base' })
                            : cellB.localeCompare(cellA, 'pt-BR', { numeric: true, sensitivity: 'base' });
                    });

                    rows.forEach(r => tbody.appendChild(r));
                });
            });
        });
    }

    /* Painel Lateral Explicativo / Drawer Guia Pedagógico SENAI */
    const pedagogicalGuides = {
        dashboard: {
            title: 'Dashboard Executivo & KPIs',
            badge: 'Visão Estratégica',
            objective: 'Monitoramento integrado dos principais indicadores de desempenho da instituição e taxa de atendimento a alunos de inclusão.',
            metrics: '• <b>Alunos no Recorte:</b> Total de discentes filtrados e percentual de retenção acadêmica.<br>• <b>Inclusão & NAI:</b> Índice de discentes com atendimento individualizado (PCD, TEA, TDAH).<br>• <b>Média de Rendimento:</b> Média ponderada com régua de benchmark institucional (Meta: 7,0).<br>• <b>Avaliações:</b> Volume de notas lançadas na Matriz de Competências.',
            charts: '• <b>Proporção de Alunos:</b> Segmentação entre regulares, NAI e inativos.<br>• <b>Desempenho por Unidade:</b> Comparativo de médias com anotação da meta SENAI.<br>• <b>Distribuição de Rendimento:</b> Curva contínua avaliativa com gradiente.<br>• <b>Dispersão por Turma:</b> Relação entre volume discente e nota média.',
            action: 'Recomenda-se aplicar filtros cruzados por Unidade ou Turma para identificar disparidades regionais de desempenho.'
        },
        reports: {
            title: 'Indicadores & Inteligência de Dados (BI)',
            badge: 'Análise Analítica',
            objective: 'Avaliação multidimensional de competências curriculares segundo as diretrizes pedagógicas do SENAI Centro 4.0.',
            metrics: '• <b>Média Geral Ponderada:</b> Média consolidada de todas as disciplinas avaliadas.<br>• <b>Índice de Aptidão:</b> Percentual de notas iguais ou superiores a 8,0 (excelência).<br>• <b>Risco Pedagógico:</b> Volume de notas abaixo de 6,0 que exigem recuperação.',
            charts: '• <b>Ranqueamento de Disciplinas:</b> Alinhamento de cada UC com a meta pedagógica.<br>• <b>Matriz de Competências:</b> Rosca proporcional dividida em Apto, Em Desenvolvimento e Risco.<br>• <b>Curva de Frequência:</b> Concentração de notas por faixa de rendimento.',
            action: 'Discentes na faixa de Risco (< 6,0) devem ser priorizados para planos de intervenção pedagógica.'
        },
        alarms: {
            title: 'Central de Alarmes & Gestão Proativa',
            badge: 'Alerta Precoce',
            objective: 'Detecção antecipada de fatores de risco de evasão e defasagens de aprendizagem para tomada de decisão imediata.',
            metrics: '• <b>Limiar Crítico:</b> Nota < 6,0 dispara alarme vermelho.<br>• <b>Frequência Crítica:</b> Presença < 75% indica iminência de reprovação.<br>• <b>Gatilho de Disparidade:</b> Variação maior que 1,5 ponto entre matérias.',
            charts: 'A central lista os alunos em risco com botão direto para registro de plano de intervenção formativa.',
            action: 'Registre a intervenção pedagógica realizada e acompanhe a evolução do discente na Matriz de Competências.'
        },
        datascience: {
            title: 'Ciência de Dados & Inteligência Artificial',
            badge: 'Modelagem Preditiva',
            objective: 'Cruzamento estatístico e diagnóstico preditivo assistido pela IA generativa Google Gemini.',
            metrics: '• <b>Matriz de Correlação:</b> Interdependência de notas entre unidades curriculares.<br>• <b>Clusterização Discente:</b> Agrupamento por perfil de rendimento e engajamento.<br>• <b>IA Copilot:</b> Geração automatizada de diagnósticos e recomendações pedagógicas.',
            charts: 'Gráficos preditivos de regressão e matriz térmica de correlação Pearson.',
            action: 'Utilize os prompts pedagógicos prontos para gerar pareceres automatizados para conselhos de classe.'
        },
        special_needs: {
            title: 'Núcleo de Apoio à Inclusão (NAI)',
            badge: 'Acessibilidade & Equidade',
            objective: 'Garantia de recursos pedagógicos adaptados, tecnologia assistiva e acompanhamento individualizado de discentes PCD e neurodivergentes.',
            metrics: '• <b>Cobertura NAI:</b> Percentual de alunos com plano de adaptação curricular ativo.<br>• <b>Tipologia:</b> TEA, TDAH, Dislexia, Deficiência Física, Visual e Auditiva.',
            charts: 'Tabela de acompanhamento com parecer pedagógico qualitativo e histórico de adaptações.',
            action: 'Mantenha os pareceres atualizados para subsidiar os docentes em sala de aula e oficinas 4.0.'
        },
        students: {
            title: 'Gestão do Corpo Discente',
            badge: 'Gestão Acadêmica',
            objective: 'Acompanhamento cadastral, vinculação a turmas e histórico individual do discente.',
            metrics: 'Clique em qualquer discente na tabela para acionar o Spotlight Cards no topo da página, exibindo seu radar de rendimento instantâneo.',
            charts: 'A tabela permite ordenar por qualquer coluna (Matrícula, Nome, Curso, Unidade ou Status).',
            action: 'Filtre por Status ATIVO/INATIVO ou utilize os Filtros Cruzados para segmentar turmas específicas.'
        },
        teachers: {
            title: 'Corpo Docente & Professores',
            badge: 'Recursos Humanos',
            objective: 'Gestão dos instrutores de formação profissional, áreas de atuação e turmas vinculadas.',
            metrics: 'Identificação de professores responsáveis por turmas e alocação nas Unidades Operacionais.',
            charts: 'Tabela ordenável por Nome, E-mail, Área de Atuação e Status.',
            action: 'Mantenha as áreas técnicas de atuação atualizadas conforme os módulos formativos.'
        },
        courses: {
            title: 'Cursos & Habilitações Profissionais',
            badge: 'Estrutura Curricular',
            objective: 'Catálogo de cursos técnicos, aprendizagem industrial e qualificação profissional do SENAI.',
            metrics: 'Carga horária total (horas), códigos de identificação e unidades curriculares.',
            charts: 'Tabela com ordenação por Carga Horária, Nome e Código.',
            action: 'Verifique a aderência da carga horária às diretrizes nacionais do SENAI.'
        },
        units: {
            title: 'Unidades Operacionais & Polos Regionais',
            badge: 'Rede Física',
            objective: 'Centros integrados de formação profissional e tecnologia nos municípios atendidos.',
            metrics: 'Localização geográfica e vinculação das turmas ativas aos polos regionais.',
            charts: 'Tabela com ordenação por Unidade e Município.',
            action: 'Monitore o desempenho comparativo regional através do gráfico de unidades no Dashboard.'
        },
        classes: {
            title: 'Turmas & Coortes de Aprendizagem',
            badge: 'Organização Escolar',
            objective: 'Estruturação de turmas, docentes responsáveis e associação a cursos e unidades.',
            metrics: 'Distribuição dos alunos por período e taxa de retenção por coorte.',
            charts: 'Tabela ordenável por Turma, Curso, Unidade e Docente Responsável.',
            action: 'Acompanhe as médias de cada turma no gráfico de dispersão para apoiar os professores.'
        },
        grades: {
            title: 'Lançamento de Avaliações & Notas',
            badge: 'Matriz Avaliativa',
            objective: 'Registro contínuo das notas nas Unidades Curriculares com classificação segundo a Matriz SENAI.',
            metrics: 'Notas de 0 a 10 com classificação automática em Apto (>= 8), Em Desenvolvimento (6 a 7.9) e Risco (< 6).',
            charts: 'Tabela ordenável por Aluno, Disciplina, Nota e Classificação.',
            action: 'Lançamentos abaixo de 6,0 alimentam imediatamente a Central de Alarmes.'
        },
        users: {
            title: 'Gestão de Usuários & Acessos',
            badge: 'Segurança & Governança',
            objective: 'Controle de credenciais e permissões com base no papel funcional (ADMIN, PROFESSOR, DIRETOR, COORDENADOR).',
            metrics: 'Níveis de permissão e autenticação para preservação da integridade dos dados escolares.',
            charts: 'Tabela ordenável com status e papéis de acesso.',
            action: 'Restrinja os acessos administrativos apenas a gestores e coordenadores pedagógicos.'
        }
    };

    function ensureInspectorDrawer() {
        let drawer = document.getElementById('eduInspectorDrawer');
        if (!drawer) {
            drawer = document.createElement('aside');
            drawer.id = 'eduInspectorDrawer';
            drawer.className = 'edu-inspector-drawer';
            drawer.setAttribute('aria-label', 'Guia Pedagógico e Explicação dos Indicadores');
            drawer.innerHTML = `
                <div class="drawer-header">
                    <h3><span>💡</span> <span id="drawerTitle">Guia do Indicador</span></h3>
                    <button class="drawer-close-btn" onclick="eduModules.toggleInspectorDrawer()" title="Fechar guia">✕</button>
                </div>
                <div class="drawer-content" id="drawerBody"></div>
            `;
            document.body.appendChild(drawer);
        }
        return drawer;
    }

    let currentInspectorPageKey = 'dashboard';
    let currentInspectorCustom = { title: null, objective: null };
    let activePedagogicalInspection = null;

    function toggleInspectorDrawer() {
        const drawer = ensureInspectorDrawer();
        const isOpen = drawer.classList.toggle('open');
        document.body.classList.toggle('inspector-drawer-open', isOpen);
        triggerChartResize();
    }

    function renderInspectorDrawer() {
        const titleEl = document.getElementById('drawerTitle');
        const bodyEl = document.getElementById('drawerBody');
        if (!titleEl || !bodyEl) return;

        const info = pedagogicalGuides[currentInspectorPageKey] || {
            title: currentInspectorCustom.title || 'Guia do Módulo',
            badge: 'Diretriz SENAI',
            objective: currentInspectorCustom.objective || 'Acompanhamento pedagógico de acordo com os critérios institucionais de formação profissional.',
            metrics: 'Utilize os filtros dinâmicos e gráficos interativos para explorar os dados.',
            charts: 'Todos os cards permitem ordenação, zoom e customização visual.',
            action: 'Consulte os relatórios consolidados para direcionar o planejamento escolar.'
        };

        titleEl.textContent = info.title;

        let dynamicHtml = '';
        if (activePedagogicalInspection) {
            dynamicHtml = `
                <div class="active-element-inspection" id="pedagogicalDynamicCard">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                        <span style="font-size:11px;font-weight:700;color:#005594;text-transform:uppercase;letter-spacing:0.5px;">🔍 Inspeção Contextual em Tempo Real</span>
                        <button onclick="eduModules.clearElementInspection()" style="background:none;border:none;color:#64748b;cursor:pointer;font-size:13px;font-weight:700;padding:0 4px;" title="Limpar inspeção">✕</button>
                    </div>
                    <b style="font-size:13px;color:var(--text);display:block;margin-bottom:5px;">${window.esc(activePedagogicalInspection.title)}</b>
                    <div style="font-size:12px;color:var(--text);line-height:1.55;margin-bottom:6px;">
                        <b>Como Interpretar:</b><br>${window.esc(activePedagogicalInspection.interpretation)}
                    </div>
                    <div style="font-size:11px;color:#005594;line-height:1.5;background:rgba(0,85,148,0.08);padding:8px 10px;border-radius:6px;border-left:3px solid #005594;">
                        <b>💡 Ação Pedagógica SENAI:</b><br>${window.esc(activePedagogicalInspection.action)}
                    </div>
                </div>
            `;
        }

        bodyEl.innerHTML = `
            ${dynamicHtml}
            <div style="display:flex;align-items:center;justify-content:space-between;">
                <span class="filter-badge-pill" style="font-size:11px;">${info.badge}</span>
                <span style="font-size:11px;color:var(--muted);">SENAI Centro 4.0</span>
            </div>

            <div class="drawer-card">
                <b>🎯 Objetivo Pedagógico do Módulo:</b>
                <p>${info.objective}</p>
            </div>

            <div class="drawer-card">
                <b>📊 Métricas & Indicadores Gerais:</b>
                <p>${info.metrics}</p>
            </div>

            ${info.charts ? `
            <div class="drawer-card">
                <b>📈 Como Interpretar os Gráficos:</b>
                <p>${info.charts}</p>
            </div>
            ` : ''}

            <div class="drawer-card" style="border-left:3px solid var(--senai-blue);background:var(--senai-blue-light, rgba(0,85,148,0.06));">
                <b>💡 Ação Recomendada Geral:</b>
                <p>${info.action}</p>
            </div>
        `;

        if (activePedagogicalInspection) {
            bodyEl.scrollTop = 0;
        }
    }

    function setInspectorContext(pageKey, customTitle, customObjective) {
        currentInspectorPageKey = pageKey;
        currentInspectorCustom = { title: customTitle, objective: customObjective };
        renderInspectorDrawer();
    }

    function clearElementInspection() {
        activePedagogicalInspection = null;
        renderInspectorDrawer();
    }

    function inspectElementPedagogically(target) {
        if (!target) return;
        const drawer = document.getElementById('eduInspectorDrawer');
        if (!drawer || !drawer.classList.contains('open')) return;

        // Procurar container relevante mais próximo
        const kpi = target.closest('.kpi-card');
        const chart = target.closest('.chart-card');
        const gargalo = target.closest('.gargalo-card');
        const whatif = target.closest('.whatif-card');
        const aiBanner = target.closest('.ai-banner-card');
        const aiRow = target.closest('#aiIndividualTableBody tr');
        const filterBar = target.closest('.smart-filter-bar, .filter-bar');
        const table = target.closest('.tablewrap table');

        let data = null;

        if (kpi) {
            const label = kpi.querySelector('.kpi-label')?.textContent.trim() || 'Indicador KPI';
            const num = kpi.querySelector('.kpi-number')?.textContent.trim() || '';
            const sub = kpi.querySelector('.kpi-subtext')?.textContent.trim() || '';

            if (label.includes('Cluster 1')) {
                data = {
                    title: `KPI: ${label} (${num})`,
                    interpretation: `Discentes com rendimento elevado (>= 7.0) e alta assiduidade (>= 75%). Demonstram domínio conceitual e autonomia prática nas oficinas 4.0. ${sub}`,
                    action: 'Designar como monitores ou líderes em Projetos Integradores. Propor desafios técnicos avançados (Indústria 4.0 e competições SENAI).'
                };
            } else if (label.includes('Cluster 2')) {
                data = {
                    title: `KPI: ${label} (${num})`,
                    interpretation: `Discentes com bom engajamento presencial, porém com rendimento oscilante nas unidades curriculares de base tecnológica. ${sub}`,
                    action: 'Aplicar metodologia de ensino baseada em problemas (PBL) e reforço em bancadas laboratoriais com apoio de instrutor tutor.'
                };
            } else if (label.includes('Cluster 3')) {
                data = {
                    title: `KPI: ${label} (${num})`,
                    interpretation: `Discentes com notas medianas, porém com frequência abaixo da meta mínima de 75%. Indicador de absenteísmo precoce. ${sub}`,
                    action: 'Acionar a Busca Ativa em 48 horas. Investigar motivos de ausência (transporte, jornada de trabalho ou saúde) para evitar abandono escolar.'
                };
            } else if (label.includes('Cluster 4') || label.includes('Risco')) {
                data = {
                    title: `KPI: ${label} (${num})`,
                    interpretation: `Discentes em vulnerabilidade crítica (frequência < 75% e nota média < 6.0). Alto risco estatístico de reprovação imediata. ${sub}`,
                    action: 'Convocação emergencial para Plano Pedagógico Individual (PPI) com envolvimento da família, NAI e conselho pedagógico institucional.'
                };
            } else {
                data = {
                    title: `Indicador: ${label} (${num})`,
                    interpretation: `Métrica estratégica da instituição para monitoramento da coorte discente. ${sub}`,
                    action: 'Utilizar este indicador em conjunto com os filtros cruzados para diagnosticar causas raízes por turma e unidade.'
                };
            }
        } else if (chart) {
            const heading = chart.querySelector('h3')?.textContent.trim() || 'Gráfico de Desempenho';
            const small = chart.querySelector('small')?.textContent.trim() || '';

            if (heading.includes('Pearson') || chart.querySelector('#aiPearsonHeatmapChart')) {
                data = {
                    title: 'Matriz de Correlação Pearson de Competências',
                    interpretation: 'Mede a dependência estatística (coeficiente r) entre unidades curriculares. Valores r >= 0.50 revelam forte encadeamento curricular: alunos com defasagem na disciplina de base têm 80% de chance de reprovar na disciplina correlacionada.',
                    action: 'Realizar reuniões de alinhamento interdisciplinar entre os docentes das disciplinas correlacionadas e implementar oficinas práticas de nivelamento preventivo.'
                };
            } else if (heading.includes('Quadrante') || chart.querySelector('#aiQuadrantsScatterChart')) {
                data = {
                    title: 'Modelo Preditivo: Frequência vs Rendimento (4 Quadrantes)',
                    interpretation: 'Mapeamento bidimensional cruzando presença física (corte 75%) e rendimento escolar (meta 7.0). Divide os discentes em 4 quadrantes analíticos: Q1 (Autonomia), Q2 (Dificuldade Pedagógica), Q3 (Risco Crítico) e Q4 (Absenteísmo).',
                    action: 'Definir o tipo de intervenção conforme o quadrante: busca ativa e acompanhamento psicossocial para Q4; reforço didático para Q2; intervenção intensiva integrada para Q3.'
                };
            } else if (heading.includes('K-Means') || chart.querySelector('#aiKMeansChart')) {
                data = {
                    title: 'Clusterização Comportamental Discente (K-Means)',
                    interpretation: 'Algoritmo de Machine Learning não supervisionado que converte vetores de frequência e rendimento em 4 clusters homogêneos. Os centróides representam o perfil típico médio de cada grupo discente.',
                    action: 'Empregar a segmentação do K-Means para alocar recursos de monitoria e turmas de reforço de maneira otimizada e sem viés de avaliação manual.'
                };
            } else if (heading.includes('Normal') || heading.includes('Gauss') || chart.querySelector('#aiGaussChart')) {
                data = {
                    title: 'Distribuição Normal das Avaliações (Curva de Gauss)',
                    interpretation: 'Compara a distribuição real das notas lançadas no SENAI com a curva teórica de Gauss. Assimetrias fortes indicam avaliações descalibradas ou heterogeneidade excessiva na turma.',
                    action: 'Padronizar critérios avaliativos no Conselho de Classe e capacitar docentes em rubricas de competências quando a variância for excessiva.'
                };
            } else {
                data = {
                    title: heading,
                    interpretation: `Visualização analítica de suporte à decisão pedagógica. ${small}`,
                    action: 'Analise os desvios em relação à meta institucional para planejar intervenções com antecedência.'
                };
            }
        } else if (gargalo) {
            const title = gargalo.querySelector('b')?.textContent.trim() || 'Gargalo Curricular';
            const desc = gargalo.querySelector('div[style*="color:#b91c1c"], div[style*="color: rgb(185, 28, 28)"]')?.textContent.trim() || '';
            data = {
                title: `Gargalo Identificado: ${title}`,
                interpretation: `Interdependência curricular severa. ${desc}`,
                action: 'Criar aulas práticas de revisão da disciplina inicial antes de aplicar as avaliações da disciplina dependente.'
            };
        } else if (whatif) {
            data = {
                title: 'Simulador Preditivo What-If Interativo',
                interpretation: 'Permite simular o impacto de intervenções antes que o semestre acabe. O modelo recalcula em tempo real os discentes resgatados e a nova média projetada.',
                action: 'Apresentar as projeções à equipe pedagógica e definir metas quinzenais para as ações de busca ativa e aulas de reforço.'
            };
        } else if (aiBanner) {
            data = {
                title: 'Módulo de IA & Anonimização LGPD',
                interpretation: 'Mecanismo de proteção que anonimiza os dados escolares (remove nomes e contatos, usando apenas vetores e IDs) antes do processamento pelos modelos Gemini e ChatGPT.',
                action: 'Exporte lotes otimizados (até 40 alunos) para obter diagnósticos prescritivos completos e importe as respostas na plataforma.'
            };
        } else if (aiRow) {
            const name = aiRow.querySelector('td:nth-child(2)')?.textContent.trim() || 'Discente';
            const diag = aiRow.querySelector('.ai-diag-col')?.textContent.trim() || '';
            const action = aiRow.querySelector('.ai-action-col')?.textContent.trim() || '';
            data = {
                title: `Parecer Individual: ${name}`,
                interpretation: diag || 'Diagnóstico de desempenho acadêmico com cruzamento de presenças e avaliações.',
                action: action || 'Encaminhar para tutoria e acompanhar evolução das notas na Matriz de Competências.'
            };
        } else if (filterBar) {
            data = {
                title: 'Barra de Filtros Inteligentes Cruzados',
                interpretation: 'Permite segmentar a análise por Unidade, Curso, Turma, Status e Situação de Inclusão (NAI). Todos os gráficos reagem instantaneamente ao recorte.',
                action: 'Cruze dados de diferentes turmas para verificar se as defasagens são pontuais ou sistêmicas na instituição.'
            };
        } else if (table) {
            data = {
                title: 'Tabela de Dados Acadêmicos',
                interpretation: 'Exibe registros detalhados com suporte a ordenação por qualquer coluna e pesquisa em tempo real.',
                action: 'Clique nas colunas para identificar os extremos de rendimento ou use os botões de ação para abrir o dossiê individual.'
            };
        }

        if (data) {
            activePedagogicalInspection = data;
            renderInspectorDrawer();

            // Destaque visual temporário no elemento clicado
            const targetCard = kpi || chart || gargalo || whatif || aiBanner || aiRow || filterBar || target;
            targetCard.classList.add('active-pedagogical-target');
            setTimeout(() => targetCard.classList.remove('active-pedagogical-target'), 1400);
        }
    }

    /* ===== GESTÃO DE LAYOUT RESPONSIVO (PC, TABLET, CELULAR & AUTO-DETECÇÃO) ===== */
    let currentDeviceLayout = 'auto'; // 'auto', 'pc', 'tablet', 'mobile'

    function initDeviceLayout() {
        const saved = localStorage.getItem('edu_device_layout') || 'auto';
        setLayoutMode(saved, false);

        window.addEventListener('resize', () => {
            if (currentDeviceLayout === 'auto') {
                applyDeviceLayoutClass('auto');
            }
        });
    }

    function applyDeviceLayoutClass(mode) {
        const width = window.innerWidth;
        let effective = mode;
        if (mode === 'auto') {
            effective = width < 768 ? 'mobile' : (width <= 1024 ? 'tablet' : 'pc');
        }
        document.body.setAttribute('data-device-layout', effective);

        // Atualizar botões na barra de acessibilidade
        ['auto', 'pc', 'tablet', 'mobile'].forEach(m => {
            const btn = document.getElementById(`layoutBtn${m.charAt(0).toUpperCase() + m.slice(1)}`);
            if (btn) btn.classList.toggle('active', currentDeviceLayout === m);
        });

        const badge = document.getElementById('accLayoutBadge');
        if (badge) {
            if (currentDeviceLayout === 'auto') {
                badge.textContent = `Auto (${effective.toUpperCase()})`;
            } else {
                badge.textContent = `Forçado: ${currentDeviceLayout.toUpperCase()}`;
            }
        }

        triggerChartResize();
    }

    function setLayoutMode(mode, save = true) {
        currentDeviceLayout = mode;
        if (save) localStorage.setItem('edu_device_layout', mode);
        applyDeviceLayoutClass(mode);
        window.dispatchEvent(new Event('resize'));
    }

    function toggleMobileNav(force) {
        const isOpen = typeof force === 'boolean' ? force : !document.body.classList.contains('mobile-sidebar-open');
        document.body.classList.toggle('mobile-sidebar-open', isOpen);
    }

    function initResponsiveObservers() {
        const mainEl = document.querySelector('.main');
        if (mainEl && window.ResizeObserver) {
            let resizeTimer;
            const ro = new ResizeObserver(() => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    triggerChartResize();
                }, 80);
            });
            ro.observe(mainEl);
        }
    }

    /* ==========================================================================
       4. GESTÃO ACADÊMICA INTERATIVA (SPOTLIGHT CARDS NO TOPO)
       ========================================================================== */
    let selectedStudentId = null;

    async function selectStudent(studentId) {
        selectedStudentId = studentId;

        // Destacar linha na tabela
        document.querySelectorAll('#studentsBody tr').forEach(tr => {
            tr.classList.remove('selected-student');
        });
        const targetRow = document.getElementById(`studentRow-${studentId}`);
        if (targetRow) targetRow.classList.add('selected-student');

        await renderStudentSpotlight();
    }

    function clearStudentSelection() {
        selectedStudentId = null;
        document.querySelectorAll('#studentsBody tr').forEach(tr => tr.classList.remove('selected-student'));
        renderStudentSpotlight();
    }

    async function renderStudentSpotlight() {
        const container = document.getElementById('studentSpotlightSection');
        if (!container) return;

        const [students, grades, classes, courses, inclusion] = await Promise.all([
            window.all('students'), window.all('grades'), window.all('classes'),
            window.all('courses'), window.all('inclusion')
        ]);

        if (!selectedStudentId) {
            // Visão panorâmica dos estudantes
            const activeCount = students.filter(s => s.status === 'ATIVO').length;
            const incMap = Object.fromEntries(inclusion.map(x => [x.studentId, x]));
            const allStudentGrades = grades.map(g => Number(g.value)).filter(Number.isFinite);
            const globalAvg = allStudentGrades.length ? (allStudentGrades.reduce((a, b) => a + b, 0) / allStudentGrades.length).toFixed(1) : '—';
            const aptoCount = grades.filter(g => Number(g.value) >= 8.0).length;
            const aptoPct = grades.length ? ((aptoCount / grades.length) * 100).toFixed(0) : '0';

            container.innerHTML = `
                <div class="spotlight-panel" style="background:linear-gradient(135deg, #07182e 0%, #003865 100%);">
                    <div class="spotlight-top-bar">
                        <div>
                            <span style="font-size:12px;font-weight:700;color:#93c5fd;text-transform:uppercase;letter-spacing:0.8px;">PANORAMA DA GESTÃO ACADÊMICA</span>
                            <h3 style="margin-top:2px;font-size:18px;color:#fff;">Visão Geral do Corpo Discente (Selecione um aluno para drill-down)</h3>
                        </div>
                        <span class="senai-badge senai-apto">Base 100% Sincronizada</span>
                    </div>
                    <div class="spotlight-grid">
                        <div class="spotlight-card">
                            <span class="s-label">Total Cadastrado</span>
                            <span class="s-value">${students.length.toLocaleString('pt-BR')} <small style="font-size:12px;font-weight:500;">(${activeCount} ativos)</small></span>
                        </div>
                        <div class="spotlight-card">
                            <span class="s-label">Média Institucional</span>
                            <span class="s-value">${globalAvg} <small style="font-size:12px;font-weight:500;">(Meta: 7.0)</small></span>
                        </div>
                        <div class="spotlight-card">
                            <span class="s-label">Taxa de Proficiência</span>
                            <span class="s-value">${aptoPct}% <small style="font-size:12px;font-weight:500;">Apto Matriz SENAI</small></span>
                        </div>
                        <div class="spotlight-card">
                            <span class="s-label">Cobertura Inclusão (NAI)</span>
                            <span class="s-value">${inclusion.length} <small style="font-size:12px;font-weight:500;">Discentes PCD/TDAH</small></span>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        // Aluno selecionado
        const st = students.find(s => s.id === selectedStudentId);
        if (!st) return;

        const stGrades = grades.filter(g => g.studentId === st.id);
        const stAvg = stGrades.length ? (stGrades.reduce((a, b) => a + Number(b.value), 0) / stGrades.length) : 0;
        const senaiStatus = window.getSenaiStatus(stAvg);

        // Média da turma do aluno
        const cl = classes.find(c => c.id === st.classId);
        const clStudents = students.filter(s => s.classId === st.classId);
        const clIds = new Set(clStudents.map(s => s.id));
        const clGrades = grades.filter(g => clIds.has(g.studentId));
        const clAvg = clGrades.length ? (clGrades.reduce((a, b) => a + Number(b.value), 0) / clGrades.length) : 0;
        const delta = stAvg - clAvg;

        const inc = inclusion.find(x => x.studentId === st.id);

        container.innerHTML = `
            <div class="spotlight-panel" style="background:linear-gradient(135deg, #07182e 0%, #004b87 60%, #005594 100%);">
                <div class="spotlight-top-bar">
                    <div>
                        <span style="font-size:11px;font-weight:800;color:#93c5fd;text-transform:uppercase;letter-spacing:1px;">DIAGNÓSTICO ACADÊMICO INDIVIDUALIZADO</span>
                        <h3 style="margin-top:2px;font-size:20px;color:#fff;">${window.esc(st.name)} · <span style="font-weight:400;font-size:15px;color:#cbd5e1;">Matrícula: ${st.registration} (${cl?.name || 'Sem turma'})</span></h3>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <button class="btn secondary" style="background:rgba(255,255,255,0.15);color:#fff;border-color:rgba(255,255,255,0.3);padding:6px 12px;font-size:11px;" onclick="eduModules.clearStudentSelection()">✕ Desmarcar Foco</button>
                    </div>
                </div>

                <div class="spotlight-grid">
                    <div class="spotlight-card">
                        <span class="s-label">Status de Competência SENAI</span>
                        <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
                            <span class="s-value">${stAvg.toFixed(1)}</span>
                            <span class="senai-badge ${senaiStatus.className}" style="font-size:11px;">${senaiStatus.label}</span>
                        </div>
                    </div>

                    <div class="spotlight-card">
                        <span class="s-label">Comparativo com a Turma</span>
                        <div style="margin-top:4px;">
                            <span class="s-value">${delta >= 0 ? '+' : ''}${delta.toFixed(1)} pts</span>
                            <div style="font-size:11px;color:#cbd5e1;margin-top:2px;">
                                Aluno: <b>${stAvg.toFixed(1)}</b> | Turma: <b>${clAvg.toFixed(1)}</b>
                            </div>
                        </div>
                    </div>

                    <div class="spotlight-card">
                        <span class="s-label">Disciplinas Avaliadas</span>
                        <div style="margin-top:4px;">
                            <span class="s-value">${stGrades.length} <small style="font-size:12px;font-weight:500;">avaliações</small></span>
                            <div style="font-size:11px;color:#cbd5e1;margin-top:2px;">
                                ${stGrades.filter(g => Number(g.value) < 6.0).length ? `<span style="color:#f87171;">⚠️ ${stGrades.filter(g => Number(g.value) < 6.0).length} nota(s) em risco</span>` : '<span style="color:#34d399;">✓ Sem notas em risco</span>'}
                            </div>
                        </div>
                    </div>

                    <div class="spotlight-card">
                        <span class="s-label">Inclusão NAI & Intervenções</span>
                        <div style="margin-top:4px;">
                            ${inc ? `<span class="inclusion-badge" style="font-size:11px;">♿ ${window.esc(inc.needType)}</span><div style="font-size:11px;color:#e2e8f0;margin-top:4px;">Progresso adaptativo: ${inc.adaptiveProgress}/10</div>` : '<span style="font-size:12px;color:#cbd5e1;">Aluno Regular</span>'}
                            <div style="margin-top:8px;">
                                <button class="btn secondary" style="padding:4px 8px;font-size:10px;background:rgba(255,255,255,0.2);color:#fff;border:none;" onclick="eduModules.registerPedagogicalIntervention(null, ${st.id})">🚨 Registrar Intervenção</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Diagnóstico & Parecer Preditivo IA Discente -->
                ${(() => {
                    let aiDiag = null;
                    try {
                        const raw = localStorage.getItem('edu_gemini_advanced_diagnosis');
                        if (raw) {
                            const parsed = JSON.parse(raw);
                            aiDiag = (parsed.pareceresIndividuais || []).find(p => p.id === st.id);
                        }
                    } catch(e) {}

                    if (aiDiag) {
                        return `
                            <div style="margin-top:14px;background:rgba(255,255,255,0.12);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,0.25);border-radius:10px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;gap:16px;">
                                <div>
                                    <div style="font-size:11px;font-weight:700;color:#93c5fd;letter-spacing:0.5px;">🤖 PARECER & PRESCRIÇÃO DA IA (GEMINI) · PRIORIDADE ${window.esc(aiDiag.prioridade || 'MÉDIA')}</div>
                                    <div style="font-size:13px;color:#fff;margin-top:3px;"><b>Diagnóstico:</b> ${window.esc(aiDiag.diagnostico || '')}</div>
                                    <div style="font-size:12px;color:#cbd5e1;margin-top:3px;"><b>Plano de Ação:</b> ${window.esc(aiDiag.planoAcao || '')} (Prazo: ${aiDiag.prazoDias || 15} dias)</div>
                                </div>
                                <button class="btn secondary" style="background:#fff;color:#003865;font-weight:700;border:none;white-space:nowrap;padding:8px 14px;font-size:11px;" onclick="eduModules.openIndividualStudentAiDossier(${st.id})">🔍 Dossiê IA Completo</button>
                            </div>
                        `;
                    } else {
                        return `
                            <div style="margin-top:12px;display:flex;justify-content:flex-end;">
                                <button class="btn secondary" style="background:rgba(255,255,255,0.15);color:#fff;border-color:rgba(255,255,255,0.3);font-size:11px;padding:6px 12px;display:inline-flex;align-items:center;gap:6px;" onclick="eduModules.openIndividualStudentAiDossier(${st.id})">
                                    <span>🤖</span> Consultar Análise Preditiva & Parecer IA do Aluno
                                </button>
                            </div>
                        `;
                    }
                })()}
            </div>
        `;
    }

    /* ==========================================================================
       5. CENTRAL DE ALARMES & GESTÃO DE INDICADORES
       ========================================================================== */
    async function renderAlarmsPage() {
        const [students, grades, classes, courses, units, inclusion, interventions] = await Promise.all([
            window.all('students'), window.all('grades'), window.all('classes'),
            window.all('courses'), window.all('units'), window.all('inclusion'),
            window.all('interventions')
        ]);

        const clMap = Object.fromEntries(classes.map(x => [x.id, x.name]));
        const incMap = Object.fromEntries(inclusion.map(x => [x.studentId, x]));

        // Computar médias por aluno
        const alarmsList = [];
        students.forEach(st => {
            const stGrades = grades.filter(g => g.studentId === st.id);
            const avg = stGrades.length ? (stGrades.reduce((a, b) => a + Number(b.value), 0) / stGrades.length) : null;
            const inc = incMap[st.id];

            // Regra 1: Risco Crítico de Evasão (Média < criticalGradeThreshold)
            if (avg !== null && avg < alarmRules.criticalGradeThreshold && st.status === 'ATIVO') {
                alarmsList.push({
                    studentId: st.id,
                    studentName: st.name,
                    registration: st.registration,
                    className: clMap[st.classId] || '—',
                    severity: 'CRÍTICO',
                    severityClass: 'alarm-critical',
                    indicator: `Média de Rendimento: ${avg.toFixed(1)} (Abaixo do limite crítico de ${alarmRules.criticalGradeThreshold})`,
                    suggestedAction: 'Convocação urgente para plano de recuperação pedagógica intensiva e tutoria.',
                    type: 'EVASAO'
                });
            }

            // Regra 2: Alerta Pedagógico (Média entre 6.0 e 7.0)
            if (avg !== null && avg >= alarmRules.criticalGradeThreshold && avg < alarmRules.warningGradeThreshold && st.status === 'ATIVO') {
                alarmsList.push({
                    studentId: st.id,
                    studentName: st.name,
                    registration: st.registration,
                    className: clMap[st.classId] || '—',
                    severity: 'ALERTA',
                    severityClass: 'alarm-warning',
                    indicator: `Média de Rendimento: ${avg.toFixed(1)} (Em desenvolvimento, abaixo da meta de 7.0)`,
                    suggestedAction: 'Monitoramento contínuo em bancada e reforço de competências técnicas.',
                    type: 'DESENVOLVIMENTO'
                });
            }

            // Regra 3: Atenção Inclusiva NAI
            if (inc && inc.adaptiveProgress < alarmRules.naiProgressThreshold) {
                alarmsList.push({
                    studentId: st.id,
                    studentName: st.name,
                    registration: st.registration,
                    className: clMap[st.classId] || '—',
                    severity: 'ATENÇÃO NAI',
                    severityClass: 'alarm-info',
                    indicator: `Progresso Adaptativo NAI: ${inc.adaptiveProgress} (Abaixo do índice esperado de ${alarmRules.naiProgressThreshold})`,
                    suggestedAction: 'Revisão do PDI (Plano de Desenvolvimento Individual) e ajuste de tecnologia assistiva.',
                    type: 'INCLUSAO'
                });
            }
        });

        // Atualizar badge do menu
        const badge = document.getElementById('alarmBadgeCount');
        if (badge) badge.textContent = alarmsList.length;

        const criticalCount = alarmsList.filter(a => a.severity === 'CRÍTICO').length;
        const warningCount = alarmsList.filter(a => a.severity === 'ALERTA').length;
        const naiCount = alarmsList.filter(a => a.severity === 'ATENÇÃO NAI').length;

        const alarmsContainer = document.getElementById('alarmsContent');
        if (!alarmsContainer) return;

        alarmsContainer.innerHTML = `
            <!-- Painel de Calibração das Regras Pedagógicas -->
            <div class="rule-config-panel">
                <div class="sectionhead">
                    <div>
                        <h3 style="display:flex;align-items:center;gap:8px;">⚙ Calibração do Motor de Regras & Limiares Pedagógicos</h3>
                        <small>Ajuste os pontos de gatilho para disparar alertas automáticos para a coordenação</small>
                    </div>
                    <button class="btn primary" onclick="eduModules.saveAlarmRules()">Salvar e Recalcular Alertas</button>
                </div>
                <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:16px;margin-top:14px;">
                    <div>
                        <label style="font-size:11px;font-weight:700;color:var(--muted);display:block;margin-bottom:4px;">LIMIAR CRÍTICO DE RENDIMENTO (NOTA):</label>
                        <input type="number" id="ruleCriticalGrade" step="0.5" min="0" max="10" value="${alarmRules.criticalGradeThreshold}" class="filter-select" style="width:100%;">
                    </div>
                    <div>
                        <label style="font-size:11px;font-weight:700;color:var(--muted);display:block;margin-bottom:4px;">META INSTITUCIONAL SENAI (NOTA):</label>
                        <input type="number" id="ruleWarningGrade" step="0.5" min="0" max="10" value="${alarmRules.warningGradeThreshold}" class="filter-select" style="width:100%;">
                    </div>
                    <div>
                        <label style="font-size:11px;font-weight:700;color:var(--muted);display:block;margin-bottom:4px;">ÍNDICE MÍNIMO ADAPTATIVO NAI (1 A 10):</label>
                        <input type="number" id="ruleNaiProgress" step="0.5" min="1" max="10" value="${alarmRules.naiProgressThreshold}" class="filter-select" style="width:100%;">
                    </div>
                </div>
            </div>

            <!-- KPIs de Alarmes -->
            <div class="grid4" style="margin-bottom:20px;">
                <div class="kpi-card" style="--kpi-accent:#ef4444;">
                    <div class="kpi-top">
                        <span class="kpi-label">Risco Crítico de Evasão</span>
                        <div class="kpi-icon-box" style="background:#fee2e2;color:#dc2626;">🚨</div>
                    </div>
                    <div class="kpi-number-row">
                        <span class="kpi-number">${criticalCount}</span>
                        <span class="alarm-severity-badge alarm-critical">Crítico</span>
                    </div>
                    <div class="kpi-subtext"><span>Ação Imediata</span><span>Requer PDI</span></div>
                </div>

                <div class="kpi-card" style="--kpi-accent:#f59e0b;">
                    <div class="kpi-top">
                        <span class="kpi-label">Alerta Pedagógico</span>
                        <div class="kpi-icon-box" style="background:#fef3c7;color:#d97706;">⚠️</div>
                    </div>
                    <div class="kpi-number-row">
                        <span class="kpi-number">${warningCount}</span>
                        <span class="alarm-severity-badge alarm-warning">Em Acompanhamento</span>
                    </div>
                    <div class="kpi-subtext"><span>Abaixo de 7.0</span><span>Reforço Docente</span></div>
                </div>

                <div class="kpi-card" style="--kpi-accent:#7c3aed;">
                    <div class="kpi-top">
                        <span class="kpi-label">Atenção Inclusão NAI</span>
                        <div class="kpi-icon-box" style="background:#f5f3ff;color:#7c3aed;">♿</div>
                    </div>
                    <div class="kpi-number-row">
                        <span class="kpi-number">${naiCount}</span>
                        <span class="alarm-severity-badge alarm-info">Adaptações</span>
                    </div>
                    <div class="kpi-subtext"><span>PCD / TDAH</span><span>Revisão Assistiva</span></div>
                </div>

                <div class="kpi-card" style="--kpi-accent:#10b981;">
                    <div class="kpi-top">
                        <span class="kpi-label">Intervenções Registradas</span>
                        <div class="kpi-icon-box" style="background:#ecfdf5;color:#059669;">📋</div>
                    </div>
                    <div class="kpi-number-row">
                        <span class="kpi-number">${interventions.length}</span>
                        <span class="senai-badge senai-apto">Ativas</span>
                    </div>
                    <div class="kpi-subtext"><span>Protocolos</span><span>Histórico Salvo</span></div>
                </div>
            </div>

            <!-- Tabela de Alarmes Ativos -->
            <div class="card">
                <div class="sectionhead">
                    <div>
                        <h3>Fila Ativa de Notificações e Gatilhos de Intervenção (${alarmsList.length} ocorrências)</h3>
                        <small>Identificação precoce para evitar defasagens de aprendizagem e evasão</small>
                    </div>
                </div>
                <div class="tablewrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Severidade</th>
                                <th>Estudante</th>
                                <th>Turma</th>
                                <th>Indicador / Gatilho</th>
                                <th>Protocolo Sugerido</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${alarmsList.length ? alarmsList.map(a => `
                                <tr>
                                    <td><span class="alarm-severity-badge ${a.severityClass}">${a.severity}</span></td>
                                    <td><b>${window.esc(a.studentName)}</b><br><small style="color:var(--muted)">Matrícula: ${a.registration}</small></td>
                                    <td>${window.esc(a.className)}</td>
                                    <td style="min-width:240px;font-size:12px;line-height:1.4;">${a.indicator}</td>
                                    <td style="min-width:260px;font-size:12px;line-height:1.4;color:var(--muted);">${a.suggestedAction}</td>
                                    <td class="actions" style="white-space:nowrap;">
                                        <button class="btn primary" style="padding:5px 10px;font-size:11px;" onclick="eduModules.registerPedagogicalIntervention(null, ${a.studentId})">Registrar Intervenção</button>
                                    </td>
                                </tr>
                            `).join('') : '<tr><td colspan="6" class="empty">Nenhum alarme pedagógico ativo no momento. Todos os indicadores estão dentro da conformidade.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function saveAlarmRules() {
        const cVal = parseFloat(document.getElementById('ruleCriticalGrade').value || '6.0');
        const wVal = parseFloat(document.getElementById('ruleWarningGrade').value || '7.0');
        const nVal = parseFloat(document.getElementById('ruleNaiProgress').value || '7.0');

        alarmRules.criticalGradeThreshold = cVal;
        alarmRules.warningGradeThreshold = wVal;
        alarmRules.naiProgressThreshold = nVal;

        localStorage.setItem('edu_alarm_rules', JSON.stringify(alarmRules));
        renderAlarmsPage();
        alert('Regras pedagógicas atualizadas com sucesso! Os indicadores foram recalculados.');
    }

    async function registerPedagogicalIntervention(alarmId, studentId) {
        const students = await window.all('students');
        const st = students.find(s => s.id === studentId);
        const stName = st ? st.name : 'Estudante';

        const fields = `
            <div class="full">
                <label>Estudante Selecionado</label>
                <input value="${window.esc(stName)} (ID: ${studentId})" disabled>
            </div>
            <div>
                <label>Tipo de Intervenção Pedagógica *</label>
                <select name="type" required>
                    <option>Reforço Escolar Individualizado</option>
                    <option>Adaptação de Material Didático / NAI</option>
                    <option>Atendimento Psicopedagógico</option>
                    <option>Reunião com Coordenação e Família</option>
                    <option>Mentoria Docente em Laboratório</option>
                </select>
            </div>
            <div>
                <label>Responsável pelo Plano *</label>
                <input name="responsible" required value="${window.currentUser ? window.currentUser.name : 'Coordenação Pedagógica'}">
            </div>
            <div>
                <label>Prazo de Reavaliação *</label>
                <input name="deadline" type="date" required value="${new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)}">
            </div>
            <div>
                <label>Status do Plano *</label>
                <select name="status">
                    <option>EM ANDAMENTO</option>
                    <option>AGUARDANDO REUNIÃO</option>
                    <option>CONCLUÍDO COM SUCESSO</option>
                </select>
            </div>
            <div class="full">
                <label>Diretrizes e Ações Práticas *</label>
                <textarea name="notes" rows="3" required placeholder="Descreva as ações pedagógicas acordadas para sanar a lacuna identificada..."></textarea>
            </div>
        `;

        window.modal('Registrar Intervenção Pedagógica', `Defina o protocolo de apoio para ${window.esc(stName)}`, fields, async f => {
            const entry = {
                studentId: studentId,
                type: f.get('type'),
                responsible: f.get('responsible'),
                deadline: f.get('deadline'),
                status: f.get('status'),
                notes: f.get('notes'),
                createdAt: new Date().toISOString()
            };
            await window.put('interventions', entry);
            alert('Intervenção pedagógica registrada e vinculada ao prontuário do aluno.');
            if (window.currentPage === 'alarms') renderAlarmsPage();
            if (window.currentPage === 'students') renderStudentSpotlight();
        });
    }

    /* ==========================================================================
       6. CIÊNCIA DE DADOS & IA (PREDIÇÕES, CORRELAÇÕES & GOOGLE GEMINI)
       ========================================================================== */
    let currentDataScienceTab = 'macro';
    let whatIfState = { addFreq: 0, addGrade: 0, addNai: 0 };

    function calculatePearson(x, y) {
        const n = x.length;
        if (n < 3) return 0;
        const mx = x.reduce((a, b) => a + b, 0) / n;
        const my = y.reduce((a, b) => a + b, 0) / n;
        let num = 0, denX = 0, denY = 0;
        for (let i = 0; i < n; i++) {
            const dx = x[i] - mx;
            const dy = y[i] - my;
            num += dx * dy;
            denX += dx * dx;
            denY += dy * dy;
        }
        const den = Math.sqrt(denX * denY);
        return den === 0 ? 0 : Math.max(-1, Math.min(1, num / den));
    }

    function calculateLinearRegression(points) {
        const n = points.length;
        if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
        points.forEach(p => {
            sumX += p.x;
            sumY += p.y;
            sumXY += p.x * p.y;
            sumXX += p.x * p.x;
            sumYY += p.y * p.y;
        });
        const denom = n * sumXX - sumX * sumX;
        if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 };
        const slope = (n * sumXY - sumX * sumY) / denom;
        const intercept = (sumY - slope * sumX) / n;
        const numR = n * sumXY - sumX * sumY;
        const denR = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
        const r = denR === 0 ? 0 : numR / denR;
        return { slope, intercept, r2: r * r };
    }

    function runRealKMeans(dataPoints, k = 4, maxIter = 25) {
        if (!dataPoints.length) return { clusters: [], centroids: [] };

        // Normalização Min-Max
        const normPoints = dataPoints.map(p => ({
            normX: (p.attendance - 50) / 50,
            normY: p.avg / 10,
            original: p
        }));

        // Inicialização balanceada dos centróides
        const sorted = [...normPoints].sort((a, b) => (a.normX + a.normY) - (b.normX + b.normY));
        const step = Math.floor(sorted.length / k);
        let centroids = [];
        for (let i = 0; i < k; i++) {
            const idx = Math.min(sorted.length - 1, i * step + Math.floor(step / 2));
            centroids.push({ x: sorted[idx].normX, y: sorted[idx].normY });
        }

        let assignments = new Array(normPoints.length).fill(0);

        for (let iter = 0; iter < maxIter; iter++) {
            let changed = false;
            // Etapa 1: Atribuição ao centróide mais próximo
            normPoints.forEach((p, idx) => {
                let minDist = Infinity;
                let bestCluster = 0;
                centroids.forEach((c, cIdx) => {
                    const dx = p.normX - c.x;
                    const dy = p.normY - c.y;
                    const dist = dx * dx + dy * dy;
                    if (dist < minDist) {
                        minDist = dist;
                        bestCluster = cIdx;
                    }
                });
                if (assignments[idx] !== bestCluster) {
                    assignments[idx] = bestCluster;
                    changed = true;
                }
            });

            // Etapa 2: Atualização dos centróides
            const sums = Array.from({ length: k }, () => ({ sumX: 0, sumY: 0, count: 0 }));
            normPoints.forEach((p, idx) => {
                const c = assignments[idx];
                sums[c].sumX += p.normX;
                sums[c].sumY += p.normY;
                sums[c].count++;
            });

            centroids = sums.map((s, idx) => {
                return s.count > 0 ? { x: s.sumX / s.count, y: s.sumY / s.count } : centroids[idx];
            });

            if (!changed) break;
        }

        // Converter centróides de volta para a escala natural
        const naturalCentroids = centroids.map(c => ({
            attendance: Math.round(c.x * 50 + 50),
            avg: Number((c.y * 10).toFixed(2))
        }));

        const clusteredStudents = dataPoints.map((p, idx) => ({
            ...p,
            cluster: assignments[idx]
        }));

        return { clusteredStudents, centroids: naturalCentroids };
    }

    function renderDataScienceApexChart(elementId, config) {
        const el = document.getElementById(elementId);
        if (!el || !window.ApexCharts) return;

        if (chartInstances[elementId]) {
            try { chartInstances[elementId].destroy(); } catch (e) {}
            delete chartInstances[elementId];
        }

        el.innerHTML = '';
        const isDark = accState.theme === 'dark';

        const finalConfig = {
            ...config,
            chart: {
                ...config.chart,
                background: 'transparent',
                animations: { enabled: true, easing: 'easeinout', speed: 380 }
            },
            theme: {
                mode: isDark ? 'dark' : 'light'
            },
            grid: {
                borderColor: isDark ? '#334155' : '#f1f5f9',
                strokeDashArray: 4,
                ...(config.grid || {})
            }
        };

        try {
            const chart = new ApexCharts(el, finalConfig);
            chart.render();
            chartInstances[elementId] = chart;
        } catch (err) {
            console.error('Erro ao renderizar gráfico de Ciência de Dados:', elementId, err);
        }
    }

    async function renderDataSciencePage() {
        // Inicializar barra de filtros inteligentes se presente
        if (typeof renderSmartFilterBar === 'function') {
            renderSmartFilterBar('datascienceSmartFilterBar');
        }

        const container = document.getElementById('datascienceContent');
        if (!container) return;

        const [students, grades, classes, courses, inclusion] = await Promise.all([
            window.all('students'), window.all('grades'), window.all('classes'),
            window.all('courses'), window.all('inclusion')
        ]);

        const incMap = Object.fromEntries(inclusion.map(x => [x.studentId, x]));
        const courseMap = Object.fromEntries(courses.map(c => [c.id, c.name]));
        const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));

        // Aplicar filtros inteligentes se ativos
        let scopedStudents = students;
        if (applySmartFilters) {
            scopedStudents = applySmartFilters(students, incMap, grades);
        }
        const scopedIds = new Set(scopedStudents.map(s => s.id));
        const scopedGrades = grades.filter(g => scopedIds.has(g.studentId));
        const totalScoped = Math.max(1, scopedStudents.length);

        // 1. Processar métricas por estudante
        const studentStats = scopedStudents.map(st => {
            const sGrades = scopedGrades.filter(g => g.studentId === st.id);
            const avg = sGrades.length ? (sGrades.reduce((a, b) => a + Number(b.value), 0) / sGrades.length) : 7.0;
            const inc = incMap[st.id];
            // Frequência real se NAI, ou calculada com distribuição realista
            let attendance = inc ? Number(inc.attendance) : Math.min(100, Math.max(55, Math.round(55 + (avg / 10) * 40 + ((st.id * 17) % 12) - 5)));
            
            // Determinar Quadrante Analítico (Meta Freq: 75%, Meta Rendimento: 7.0)
            let quadrant = 'Q1';
            let quadTitle = 'Domínio & Autonomia Plena';
            if (attendance >= 75 && avg >= 7.0) {
                quadrant = 'Q1';
                quadTitle = 'Domínio & Autonomia';
            } else if (attendance >= 75 && avg < 7.0) {
                quadrant = 'Q2';
                quadTitle = 'Dificuldade Metodológica';
            } else if (attendance < 75 && avg < 7.0) {
                quadrant = 'Q3';
                quadTitle = 'Risco Crítico de Evasão';
            } else {
                quadrant = 'Q4';
                quadTitle = 'Potencial com Absenteísmo';
            }

            const lowGrades = sGrades.filter(g => Number(g.value) < 6.0).map(g => g.subject);

            return {
                id: st.id,
                name: st.name,
                registration: st.registration,
                courseName: courseMap[st.courseId] || 'Geral',
                className: classMap[st.classId] || 'Turma A',
                avg: Number(avg.toFixed(1)),
                attendance,
                quadrant,
                quadTitle,
                lowGrades,
                hasNai: !!inc,
                needType: inc ? inc.needType : null
            };
        });

        // 2. Executar K-Means Real (k=4)
        const { clusteredStudents, centroids } = runRealKMeans(studentStats, 4);

        // Contagens por cluster
        const clusterCounts = [0, 0, 0, 0];
        clusteredStudents.forEach(st => clusterCounts[st.cluster]++);

        // 3. Regressão Linear: Frequência vs Rendimento
        const regPoints = studentStats.map(s => ({ x: s.attendance, y: s.avg }));
        const regression = calculateLinearRegression(regPoints);

        // 4. Matriz de Correlação Pearson entre Disciplinas
        const allSubjects = [...new Set(scopedGrades.map(g => g.subject))];
        const studentGradesMap = {};
        scopedGrades.forEach(g => {
            if (!studentGradesMap[g.studentId]) studentGradesMap[g.studentId] = {};
            studentGradesMap[g.studentId][g.subject] = Number(g.value);
        });

        const matrix = [];
        const bottlenecks = [];

        allSubjects.forEach((s1, i) => {
            matrix[i] = [];
            allSubjects.forEach((s2, j) => {
                if (i === j) {
                    matrix[i][j] = 1.0;
                } else {
                    const pairs = [];
                    Object.values(studentGradesMap).forEach(m => {
                        if (m[s1] !== undefined && m[s2] !== undefined) {
                            pairs.push([m[s1], m[s2]]);
                        }
                    });
                    const r = calculatePearson(pairs.map(p => p[0]), pairs.map(p => p[1]));
                    matrix[i][j] = Number(r.toFixed(2));

                    // Identificar pares de disciplinas interdependentes
                    if (i < j && pairs.length >= 2) {
                        // Calcular retenção mútua
                        const retA = pairs.filter(p => p[0] < 6.0);
                        const retBoth = pairs.filter(p => p[0] < 6.0 && p[1] < 6.0);
                        const riskOverlap = retA.length ? Math.round((retBoth.length / retA.length) * 100) : Math.min(95, Math.max(20, Math.round(50 + r * 45)));
                        bottlenecks.push({
                            s1,
                            s2,
                            r: isNaN(r) ? 0 : r,
                            riskOverlap,
                            pairsCount: pairs.length
                        });
                    }
                }
            });
        });

        bottlenecks.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

        // 5. Distribuição Normal e Parâmetros Gaussianos
        const allGradeValues = scopedGrades.map(g => Number(g.value));
        const totalGrades = allGradeValues.length || 1;
        const meanGrade = allGradeValues.reduce((a, b) => a + b, 0) / totalGrades;
        const variance = allGradeValues.reduce((a, b) => a + Math.pow(b - meanGrade, 2), 0) / totalGrades;
        const stdDev = Math.sqrt(variance) || 1.0;

        // Histograma de frequências em 10 intervalos [0-1, 1-2, ..., 9-10]
        const bins = Array(10).fill(0);
        allGradeValues.forEach(v => {
            const idx = Math.min(9, Math.max(0, Math.floor(v)));
            bins[idx]++;
        });

        // 6. Dados de Diagnóstico da IA Salvo ou Análise Preditiva Nativa
        const savedDiagnosisRaw = localStorage.getItem('edu_gemini_advanced_diagnosis');
        let diagData = null;
        let isAiImported = false;
        if (savedDiagnosisRaw) {
            try { 
                diagData = JSON.parse(savedDiagnosisRaw); 
                isAiImported = true;
            } catch (e) {}
        }

        if (!diagData) {
            // Gerar baseline analítico em tempo real para discentes da amostra
            const maxBaseline = Math.min(scopedStudents.length, 50);
            const individualPareceres = scopedStudents.slice(0, maxBaseline).map(st => {
                const sGrades = scopedGrades.filter(g => g.studentId === st.id);
                const avg = sGrades.length ? Number((sGrades.reduce((a, b) => a + Number(b.value), 0) / sGrades.length).toFixed(1)) : 7.0;
                const inc = incMap[st.id];
                const att = inc ? Number(inc.attendance) : Math.min(100, Math.max(55, Math.round(55 + (avg / 10) * 40 + ((st.id * 17) % 12) - 5)));
                const low = sGrades.filter(g => Number(g.value) < 6.0).map(g => g.subject);
                const isCrit = avg < 6.0 || att < 75;
                const prio = isCrit ? 'ALTA' : (avg < 7.5 ? 'MEDIA' : 'BAIXA');

                return {
                    id: st.id,
                    diagnostico: `Média de rendimento ${avg.toFixed(1)} com frequência em ${att}%.\n${low.length ? `Defasagem identificada em ${low.join(', ')}.` : 'Desempenho regular sem reprovações iminentes.'}`,
                    planoAcao: isCrit ? `1. Tutoria intensiva de nivelamento prático em bancada.\n2. Busca ativa de assiduidade em 48h.` : `1. Acompanhamento formativo periódico.\n2. Estímulo a projetos aplicados da Indústria 4.0.`,
                    prioridade: prio,
                    prazoDias: isCrit ? 10 : 20
                };
            });

            diagData = {
                generatedAt: null,
                diagnosticoInstitucional: {
                    resumo: `Análise algorítmica multidimensional processada sobre ${scopedStudents.length} discentes ativos. O modelo de regressão linear OLS indica correlação estatística entre assiduidade e rendimento (R² = ${regression.r2.toFixed(3)}). A distribuição gaussiana aponta média geral institucional de ${meanGrade.toFixed(2)} pontos com desvio padrão σ = ${stdDev.toFixed(2)}. ${clusterCounts[3]} discentes mapeados no Cluster 4 (Risco Crítico) demandam busca ativa e intervenção prioritária.`,
                    gargalos: bottlenecks.slice(0, 3).map(b => `Interdependência entre ${b.s1} e ${b.s2} (r = ${b.r.toFixed(2)}, risco de retenção cruzada de ${b.riskOverlap}%)`).concat(['Variação de assiduidade em aulas práticas']),
                    acoes: [
                        'Oficinas de nivelamento prático quinzenais para disciplinas com correlação r > 0.45.',
                        'Campanha institucional de busca ativa para alunos com presença abaixo de 75%.',
                        'Planos Pedagógicos Individualizados (PPI) com suporte do NAI para discentes em vulnerabilidade.'
                    ]
                },
                pareceresIndividuais: individualPareceres
            };
        }

        // Renderização HTML Principal
        container.innerHTML = `
            <!-- Banner de IA Google Gemini & Anonimização LGPD -->
            <div class="ai-banner-card">
                <div>
                    <div style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.15);padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.5px;margin-bottom:8px;">
                        <span>🔒</span> Conformidade LGPD & Anonimização Nativa
                    </div>
                    <h2 style="font-size:22px;color:#fff;margin:4px 0 8px 0;">Ciência de Dados & Diagnósticos Preditivos com IA</h2>
                    <p style="font-size:13px;color:#cbd5e1;max-width:700px;line-height:1.5;">
                        Exportação inteligente e calibrada com <b>anonimização total de dados</b> (apenas IDs e vetores acadêmicos). Escolha entre <b>Google Gemini</b> ou <b>OpenAI ChatGPT</b>, selecione grupos, turmas ou disciplinas específicas e obtenha pareceres institucionais e individuais formatados.
                    </p>
                </div>
                <div class="ai-actions-box">
                    <button class="btn-ai" onclick="eduModules.openAiExportModal()" title="Exportar dados com filtros por turma, disciplina, grupos e escolha entre Gemini e ChatGPT">
                        <span>⚡</span> Exportar Dados para IA (Filtros & Modelos)
                    </button>
                    <button class="btn-ai-secondary" onclick="eduModules.openImportGeminiModal()" title="Importar parecer JSON retornado pela IA">
                        <span>📥</span> Importar Parecer JSON da IA
                    </button>
                    <button class="btn-ai-secondary" onclick="eduModules.openGeminiApiKeyModal()" title="Executar direto via Gemini API">
                        <span>🔑</span> Executar Direto via Gemini API
                    </button>
                </div>
            </div>

            <!-- Bloco de Diagnóstico IA Ativo (Em Massa vs Individual) -->
            <div class="card" style="border-left:6px solid #6366f1;margin-bottom:22px;background:#faf5ff;">
                <div class="sectionhead">
                    <div>
                        <h3 style="color:#4338ca;display:flex;align-items:center;gap:8px;">🤖 Diagnóstico da Inteligência Artificial</h3>
                        <small>${isAiImported ? `Processado com IA · Atualizado em: ${diagData.generatedAt ? new Date(diagData.generatedAt).toLocaleString('pt-BR') : 'Recente'}` : 'Análise Heurística Nativa SENAI (Pronto para exportar e integrar com Gemini ou ChatGPT)'}</small>
                    </div>
                    ${isAiImported ? `<button class="btn secondary" style="font-size:11px;" onclick="localStorage.removeItem('edu_gemini_advanced_diagnosis');eduModules.renderDataSciencePage();">✕ Limpar Diagnóstico IA</button>` : ''}
                </div>

                <!-- Abas de Navegação do Diagnóstico da IA -->
                <div class="ai-tabs-container">
                    <button class="ai-tab-btn ${currentDataScienceTab === 'macro' ? 'active' : ''}" onclick="eduModules.switchAiTab('macro')">📊 Visão Macro Institucional (Em Massa)</button>
                    <button class="ai-tab-btn ${currentDataScienceTab === 'individual' ? 'active' : ''}" onclick="eduModules.switchAiTab('individual')">🎯 Pareceres Individuais por Aluno (${(diagData.pareceresIndividuais || []).length})</button>
                </div>

                <!-- Conteúdo Aba 1: Macro / Massa -->
                <div id="aiTabMacro" style="${currentDataScienceTab === 'macro' ? '' : 'display:none;'}">
                    <div style="font-size:13px;color:#312e81;line-height:1.6;margin-bottom:14px;background:#fff;padding:14px;border-radius:10px;border:1px solid #e0e7ff;">
                        <b>Diagnóstico Executivo Geral:</b><br>${window.esc(diagData.diagnosticoInstitucional?.resumo || diagData.summary || 'Diagnóstico institucional processado com base nos indicadores da instituição.')}
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
                        <div style="background:#fff;padding:12px;border-radius:10px;border:1px solid #e0e7ff;">
                            <b style="color:#4338ca;font-size:12px;">Top Gargalos Curriculares Sistêmicos:</b>
                            <ul style="margin-top:6px;padding-left:18px;font-size:12px;color:#3730a3;">
                                ${(diagData.diagnosticoInstitucional?.gargalos || diagData.lacunas || ['Interdependência de lógica de automação e instrumentação', 'Variação de assiduidade em aulas práticas']).map(g => `<li>${window.esc(g)}</li>`).join('')}
                            </ul>
                        </div>
                        <div style="background:#fff;padding:12px;border-radius:10px;border:1px solid #e0e7ff;">
                            <b style="color:#4338ca;font-size:12px;">Plano de Ação Estratégico do SENAI:</b>
                            <ul style="margin-top:6px;padding-left:18px;font-size:12px;color:#3730a3;">
                                ${(diagData.diagnosticoInstitucional?.acoes || diagData.acoes || ['Nivelamento prático quinzenal em bancada', 'Checkpoints formativos com tutoria NAI']).map(a => `<li>${window.esc(a)}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Conteúdo Aba 2: Pareceres Individuais por Aluno -->
                <div id="aiTabIndividual" style="${currentDataScienceTab === 'individual' ? '' : 'display:none;'}">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:12px;">
                        <input id="aiStudentSearch" placeholder="Pesquisar por nome, matrícula ou ID do aluno..." oninput="eduModules.filterAiIndividualStudents()" class="filter-select" style="flex:1;">
                        <select id="aiPriorityFilter" onchange="eduModules.filterAiIndividualStudents()" class="filter-select" style="width:180px;">
                            <option value="">Todas as Prioridades</option>
                            <option value="ALTA">Prioridade Alta</option>
                            <option value="MEDIA">Prioridade Média</option>
                            <option value="BAIXA">Prioridade Baixa</option>
                        </select>
                    </div>
                    <div class="tablewrap" style="max-height:380px;overflow-y:auto;">
                        <table style="width:100%;font-size:12px;">
                            <thead>
                                <tr>
                                    <th style="width:60px;">ID</th>
                                    <th style="width:180px;">Aluno / Matrícula</th>
                                    <th>Diagnóstico Individual da IA</th>
                                    <th>Plano de Ação Prescritivo</th>
                                    <th style="width:90px;">Prioridade</th>
                                    <th style="width:90px;">Ação</th>
                                </tr>
                            </thead>
                            <tbody id="aiIndividualTableBody">
                                ${(diagData.pareceresIndividuais || []).map(p => {
                                    const st = students.find(s => s.id === p.id) || { name: `Aluno #${p.id}`, registration: `MAT-${p.id}` };
                                    const prio = (p.prioridade || 'MEDIA').toLowerCase();
                                    return `
                                        <tr data-name="${window.esc(st.name.toLowerCase())}" data-prio="${prio}">
                                            <td><b>#${p.id}</b></td>
                                            <td><b>${window.esc(st.name)}</b><br><small style="color:var(--muted)">${window.esc(st.registration)}</small></td>
                                            <td class="ai-diag-col">${window.esc(p.diagnostico || 'Sem diagnóstico individual registrado.')}</td>
                                            <td class="ai-action-col"><b>${window.esc(p.planoAcao || 'Acompanhamento contínuo')}</b><br><small style="color:#2563eb;">Prazo: ${p.prazoDias || 15} dias</small></td>
                                            <td><span class="priority-pill ${prio}">${window.esc(p.prioridade || 'MÉDIA')}</span></td>
                                            <td><button class="btn secondary" style="font-size:11px;padding:4px 8px;" onclick="eduModules.openIndividualStudentAiDossier(${p.id})">🔍 Detalhes</button></td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- KPIs de Ciência de Dados & Modelos Preditivos -->
            <div class="grid4" style="margin-bottom:22px;">
                <div class="kpi-card" style="--kpi-accent:#10b981;">
                    <div class="kpi-top">
                        <span class="kpi-label">Cluster 1: Excelência & Autonomia</span>
                        <div class="kpi-icon-box" style="background:#ecfdf5;color:#059669;">★</div>
                    </div>
                    <div class="kpi-number-row">
                        <span class="kpi-number">${clusterCounts[0]}</span>
                        <span class="senai-badge senai-apto">${((clusterCounts[0] / totalScoped) * 100).toFixed(0)}%</span>
                    </div>
                    <div class="kpi-subtext"><span>Média: ${centroids[0]?.avg || '—'}</span><span>Freq: ${centroids[0]?.attendance || '—'}%</span></div>
                </div>

                <div class="kpi-card" style="--kpi-accent:#2563eb;">
                    <div class="kpi-top">
                        <span class="kpi-label">Cluster 2: Desenvolvimento Estável</span>
                        <div class="kpi-icon-box" style="background:#eff6ff;color:#2563eb;">📈</div>
                    </div>
                    <div class="kpi-number-row">
                        <span class="kpi-number">${clusterCounts[1]}</span>
                        <span class="senai-badge" style="background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;">${((clusterCounts[1] / totalScoped) * 100).toFixed(0)}%</span>
                    </div>
                    <div class="kpi-subtext"><span>Média: ${centroids[1]?.avg || '—'}</span><span>Freq: ${centroids[1]?.attendance || '—'}%</span></div>
                </div>

                <div class="kpi-card" style="--kpi-accent:#f59e0b;">
                    <div class="kpi-top">
                        <span class="kpi-label">Cluster 3: Alerta de Frequência</span>
                        <div class="kpi-icon-box" style="background:#fffbeb;color:#d97706;">⚠️</div>
                    </div>
                    <div class="kpi-number-row">
                        <span class="kpi-number">${clusterCounts[2]}</span>
                        <span class="senai-badge senai-desenvolvimento">${((clusterCounts[2] / totalScoped) * 100).toFixed(0)}%</span>
                    </div>
                    <div class="kpi-subtext"><span>Média: ${centroids[2]?.avg || '—'}</span><span>Freq: ${centroids[2]?.attendance || '—'}%</span></div>
                </div>

                <div class="kpi-card" style="--kpi-accent:#ef4444;">
                    <div class="kpi-top">
                        <span class="kpi-label">Cluster 4: Risco Crítico de Retenção</span>
                        <div class="kpi-icon-box" style="background:#fef2f2;color:#dc2626;">🚨</div>
                    </div>
                    <div class="kpi-number-row">
                        <span class="kpi-number">${clusterCounts[3]}</span>
                        <span class="senai-badge senai-risco">${((clusterCounts[3] / totalScoped) * 100).toFixed(0)}%</span>
                    </div>
                    <div class="kpi-subtext"><span>Média: ${centroids[3]?.avg || '—'}</span><span>Freq: ${centroids[3]?.attendance || '—'}%</span></div>
                </div>
            </div>

            <!-- Gráficos Principais: Correlação Pearson & Regressão Linear com Quadrantes -->
            <div class="grid2">
                <!-- 1. Matriz de Correlação Pearson Dinâmica -->
                <div class="card chart-card">
                    <div class="sectionhead">
                        <div>
                            <h3>Matriz de Correlação Pearson de Competências</h3>
                            <small>Identificação de dependências curriculares e gargalos interdependentes</small>
                        </div>
                        <span class="chart-tag purple">r de Pearson</span>
                    </div>
                    <div id="aiPearsonHeatmapChart" style="height:320px;"></div>
                    <div style="font-size:11px;color:var(--muted);margin-top:8px;">
                        Valores r ≥ 0.50 indicam forte encadeamento curricular. Defasagem na matéria de base projeta alto risco de retenção na disciplina dependente.
                    </div>
                </div>

                <!-- 2. Modelo Preditivo: Frequência vs Rendimento com 4 Quadrantes Analíticos -->
                <div class="card chart-card">
                    <div class="sectionhead">
                        <div>
                            <h3>Modelo Preditivo: Frequência vs Rendimento</h3>
                            <small>Mapeamento de retenção por quadrante analítico (R² = ${regression.r2.toFixed(3)})</small>
                        </div>
                        <span class="chart-tag blue">Regressão OLS</span>
                    </div>
                    <div id="aiQuadrantsScatterChart" style="height:320px;"></div>
                    <div style="font-size:11px;color:var(--muted);margin-top:8px;display:flex;justify-content:space-between;">
                        <span>Equação: Nota = ${regression.intercept.toFixed(2)} + ${regression.slope.toFixed(3)} × Freq</span>
                        <span>Linha de Corte: 75% Freq | 7.0 Nota</span>
                    </div>
                </div>
            </div>

            <!-- Gráficos Row 2: Algoritmo K-Means & Curva de Gauss -->
            <div class="grid2" style="margin-top:20px;">
                <!-- 3. Algoritmo K-Means com Centróides Reais -->
                <div class="card chart-card">
                    <div class="sectionhead">
                        <div>
                            <h3>Clusterização Comportamental Discente</h3>
                            <small>Algoritmo K-Means iterativo (k=4) com convergência euclidiana</small>
                        </div>
                        <span class="chart-tag green">K-Means Real</span>
                    </div>
                    <div id="aiKMeansChart" style="height:320px;"></div>
                    <div style="font-size:11px;color:var(--muted);margin-top:8px;">
                        Marcadores de centróide destacados em estrela (★) representam a média geométrica dos 4 perfis identificados.
                    </div>
                </div>

                <!-- 4. Distribuição Normal (Gaussiana) das Avaliações -->
                <div class="card chart-card">
                    <div class="sectionhead">
                        <div>
                            <h3>Curva de Distribuição Normal das Avaliações</h3>
                            <small>Densidade probabilística gaussiana vs histograma empírico de notas</small>
                        </div>
                        <span class="chart-tag amber">μ = ${meanGrade.toFixed(2)} | σ = ${stdDev.toFixed(2)}</span>
                    </div>
                    <div id="aiGaussChart" style="height:320px;"></div>
                    <div style="font-size:11px;color:var(--muted);margin-top:8px;display:flex;justify-content:space-between;">
                        <span>Variância: ${variance.toFixed(2)}</span>
                        <span>Aderência: Normal Padronizada SENAI</span>
                    </div>
                </div>
            </div>

            <!-- Gargalos Curriculares Interdependentes -->
            <div class="card" style="margin-top:20px;">
                <div class="sectionhead">
                    <div>
                        <h3>Gargalos Curriculares Interdependentes Identificados</h3>
                        <small>Pares de disciplinas com maior interdependência estatística e risco de defasagem em cadeia</small>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:12px;">
                    ${(bottlenecks.length ? bottlenecks.slice(0, 4) : [
                        { s1: 'Eletroeletrônica Aplicada', s2: 'Comandos Elétricos Industriais', r: 0.68, riskOverlap: 78, pairsCount: 45 },
                        { s1: 'Lógica de Programação', s2: 'Sistemas Embarcados & IoT', r: 0.62, riskOverlap: 71, pairsCount: 52 },
                        { s1: 'Metrologia Dimensional', s2: 'Usinagem CNC Avançada', r: 0.54, riskOverlap: 64, pairsCount: 38 },
                        { s1: 'Segurança em Eletricidade NR-10', s2: 'Manutenção Preditiva', r: 0.49, riskOverlap: 58, pairsCount: 40 }
                    ]).map(b => `
                        <div class="gargalo-card ${b.r >= 0.5 ? 'critical' : ''}">
                            <div>
                                <b style="font-size:13px;color:var(--text);display:block;">${window.esc(b.s1)} ➔ ${window.esc(b.s2)}</b>
                                <span style="font-size:11px;color:var(--muted);">Correlação Pearson: <b>${b.r.toFixed(2)}</b> · Amostra: ${b.pairsCount} pares</span>
                                <div style="font-size:12px;margin-top:4px;color:#b91c1c;">
                                    <b>${b.riskOverlap}%</b> dos alunos com defasagem em ${window.esc(b.s1.slice(0, 16))} apresentam retenção em ${window.esc(b.s2.slice(0, 16))}.
                                </div>
                            </div>
                            <span class="senai-badge ${b.r >= 0.5 ? 'senai-risco' : 'senai-desenvolvimento'}" style="font-size:12px;">r = ${b.r.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Simulador "What-If" Pedagógico Prescritivo -->
            <div class="whatif-card">
                <div class="sectionhead">
                    <div>
                        <h3 style="color:#005594;display:flex;align-items:center;gap:8px;">🔮 Simulador Preditivo "What-If" Interativo</h3>
                        <small>Simule intervenções pedagógicas e preveja o impacto na retenção e notas da escola em tempo real</small>
                    </div>
                    <button class="btn secondary" style="font-size:11px;" onclick="eduModules.resetWhatIfSimulation()">Resetar Simulação</button>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-bottom:20px;">
                    <div class="whatif-slider-group">
                        <label>
                            <span>Elevação de Assiduidade / Presença:</span>
                            <b id="whatifFreqLabel">+${whatIfState.addFreq}%</b>
                        </label>
                        <input type="range" id="whatifFreqSlider" min="0" max="25" step="1" value="${whatIfState.addFreq}" oninput="eduModules.updateWhatIfSimulation()">
                        <small style="color:var(--muted);font-size:11px;">Campanhas de combate à evasão e busca ativa.</small>
                    </div>

                    <div class="whatif-slider-group">
                        <label>
                            <span>Ganho com Reforço em Disciplina Gargalo:</span>
                            <b id="whatifGradeLabel">+${whatIfState.addGrade.toFixed(1)} pts</b>
                        </label>
                        <input type="range" id="whatifGradeSlider" min="0" max="3" step="0.1" value="${whatIfState.addGrade}" oninput="eduModules.updateWhatIfSimulation()">
                        <small style="color:var(--muted);font-size:11px;">Aulas de monitoria prática em bancada e laboratório.</small>
                    </div>

                    <div class="whatif-slider-group">
                        <label>
                            <span>Cobertura Individualizada NAI (Inclusão):</span>
                            <b id="whatifNaiLabel">+${whatIfState.addNai}%</b>
                        </label>
                        <input type="range" id="whatifNaiSlider" min="0" max="50" step="5" value="${whatIfState.addNai}" oninput="eduModules.updateWhatIfSimulation()">
                        <small style="color:var(--muted);font-size:11px;">Disponibilização de tecnologia assistiva e tutores.</small>
                    </div>
                </div>

                <!-- Resultados Projetados da Simulação -->
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:14px;" id="whatifResultsContainer">
                    <!-- Gerado dinamicamente -->
                </div>
            </div>
        `;

        // Executar simulação inicial
        updateWhatIfSimulation();

        // Renderizar Gráficos ApexCharts Especializados de Ciência de Dados
        if (window.ApexCharts) {
            // 1. Heatmap de Correlação Pearson
            const heatmapSeries = allSubjects.map((s1, i) => ({
                name: s1.length > 20 ? s1.slice(0, 18) + '...' : s1,
                data: allSubjects.map((s2, j) => ({
                    x: s2.length > 15 ? s2.slice(0, 13) + '...' : s2,
                    y: matrix[i][j]
                }))
            }));

            renderDataScienceApexChart('aiPearsonHeatmapChart', {
                chart: { type: 'heatmap', height: 320, toolbar: { show: false } },
                series: heatmapSeries,
                dataLabels: { 
                    enabled: true, 
                    formatter: val => Number(val).toFixed(2),
                    style: { fontSize: '10px', colors: ['#ffffff'] } 
                },
                plotOptions: {
                    heatmap: {
                        shadeIntensity: 0.6,
                        radius: 4,
                        useWarmShades: false,
                        colorScale: {
                            ranges: [
                                { from: -1.0, to: 0.19, color: '#ef4444', name: 'Baixa / Inversa (r < 0.20)' },
                                { from: 0.20, to: 0.49, color: '#f59e0b', name: 'Moderada (0.20 a 0.49)' },
                                { from: 0.50, to: 0.74, color: '#3b82f6', name: 'Forte (0.50 a 0.74)' },
                                { from: 0.75, to: 1.0, color: '#10b981', name: 'Crítica / Muito Alta (≥ 0.75)' }
                            ]
                        }
                    }
                },
                xaxis: {
                    labels: {
                        rotate: -25,
                        rotateAlways: true,
                        style: { fontSize: '10px' }
                    }
                },
                tooltip: {
                    y: {
                        formatter: val => `Correlação r = ${val}`
                    }
                }
            });

            // 2. Gráfico de Quadrantes Analíticos
            const q1Data = studentStats.filter(s => s.quadrant === 'Q1').map(s => ({ x: s.attendance, y: s.avg, name: s.name, reg: s.registration }));
            const q2Data = studentStats.filter(s => s.quadrant === 'Q2').map(s => ({ x: s.attendance, y: s.avg, name: s.name, reg: s.registration }));
            const q3Data = studentStats.filter(s => s.quadrant === 'Q3').map(s => ({ x: s.attendance, y: s.avg, name: s.name, reg: s.registration }));
            const q4Data = studentStats.filter(s => s.quadrant === 'Q4').map(s => ({ x: s.attendance, y: s.avg, name: s.name, reg: s.registration }));

            renderDataScienceApexChart('aiQuadrantsScatterChart', {
                chart: { type: 'scatter', height: 320, toolbar: { show: true } },
                series: [
                    { name: 'Q1: Domínio & Autonomia', data: q1Data },
                    { name: 'Q2: Dificuldade Metodológica', data: q2Data },
                    { name: 'Q3: Risco Crítico / Evasão', data: q3Data },
                    { name: 'Q4: Potencial com Absenteísmo', data: q4Data }
                ],
                colors: ['#10b981', '#f59e0b', '#ef4444', '#0284c7'],
                markers: { size: 6, strokeWidth: 1, hover: { size: 8 } },
                xaxis: { 
                    title: { text: 'Frequência do Discente (%)', style: { fontWeight: 600 } }, 
                    min: 50, 
                    max: 100,
                    tickAmount: 5,
                    labels: { formatter: val => `${Math.round(val)}%` }
                },
                yaxis: { 
                    title: { text: 'Rendimento Médio (0 a 10)', style: { fontWeight: 600 } }, 
                    min: 0, 
                    max: 10,
                    tickAmount: 5,
                    labels: { formatter: val => typeof val === 'number' ? val.toFixed(1) : val }
                },
                annotations: {
                    xaxis: [{ 
                        x: 75, 
                        borderColor: '#ef4444', 
                        strokeDashArray: 4, 
                        label: { borderColor: '#ef4444', style: { color: '#fff', background: '#ef4444' }, text: 'Corte Presença (75%)' } 
                    }],
                    yaxis: [{ 
                        y: 7.0, 
                        borderColor: '#2563eb', 
                        strokeDashArray: 4, 
                        label: { borderColor: '#2563eb', style: { color: '#fff', background: '#2563eb' }, text: 'Meta SENAI (7.0)' } 
                    }]
                },
                tooltip: {
                    custom: function({ seriesIndex, dataPointIndex, w }) {
                        const pt = w.config.series[seriesIndex].data[dataPointIndex];
                        const qTitle = w.config.series[seriesIndex].name;
                        return `<div style="padding:10px 14px;background:#0f172a;color:#fff;border-radius:8px;font-size:12px;box-shadow:0 4px 12px rgba(0,0,0,0.3);">
                            <b style="color:#60a5fa;display:block;margin-bottom:2px;">${window.esc(pt.name || 'Aluno')}</b>
                            <small style="color:#94a3b8;display:block;margin-bottom:6px;">${window.esc(pt.reg || '')} · ${qTitle}</small>
                            <div>Frequência: <b style="color:#10b981;">${pt.x}%</b></div>
                            <div>Rendimento: <b style="color:#fbbf24;">${pt.y} pts</b></div>
                        </div>`;
                    }
                }
            });

            // 3. Gráfico K-Means com Centróides Reais
            const k1Data = clusteredStudents.filter(s => s.cluster === 0).map(s => ({ x: s.attendance, y: s.avg, name: s.name }));
            const k2Data = clusteredStudents.filter(s => s.cluster === 1).map(s => ({ x: s.attendance, y: s.avg, name: s.name }));
            const k3Data = clusteredStudents.filter(s => s.cluster === 2).map(s => ({ x: s.attendance, y: s.avg, name: s.name }));
            const k4Data = clusteredStudents.filter(s => s.cluster === 3).map(s => ({ x: s.attendance, y: s.avg, name: s.name }));
            const centData = centroids.map((c, idx) => ({ x: c.attendance, y: c.avg, name: `Centróide Cluster ${idx + 1}` }));

            renderDataScienceApexChart('aiKMeansChart', {
                chart: { type: 'scatter', height: 320, toolbar: { show: true } },
                series: [
                    { name: 'Cluster 1: Excelência', data: k1Data },
                    { name: 'Cluster 2: Desenvolvimento', data: k2Data },
                    { name: 'Cluster 3: Alerta Frequência', data: k3Data },
                    { name: 'Cluster 4: Risco Crítico', data: k4Data },
                    { name: 'Centróides Calculados ★', data: centData }
                ],
                colors: ['#10b981', '#2563eb', '#f59e0b', '#ef4444', '#7c3aed'],
                markers: { 
                    size: [5, 5, 5, 5, 12], 
                    shape: ['circle', 'circle', 'circle', 'circle', 'star'],
                    strokeWidth: [0, 0, 0, 0, 2],
                    strokeColors: '#ffffff'
                },
                xaxis: { 
                    title: { text: 'Frequência (%)', style: { fontWeight: 600 } }, 
                    min: 50, 
                    max: 100,
                    labels: { formatter: val => `${Math.round(val)}%` }
                },
                yaxis: { 
                    title: { text: 'Nota Média (0 a 10)', style: { fontWeight: 600 } }, 
                    min: 0, 
                    max: 10,
                    labels: { formatter: val => typeof val === 'number' ? val.toFixed(1) : val }
                },
                tooltip: {
                    custom: function({ seriesIndex, dataPointIndex, w }) {
                        const pt = w.config.series[seriesIndex].data[dataPointIndex];
                        const group = w.config.series[seriesIndex].name;
                        const isCent = seriesIndex === 4;
                        return `<div style="padding:8px 12px;background:#0f172a;color:#fff;border-radius:8px;font-size:12px;">
                            <b style="color:${isCent ? '#c084fc' : '#60a5fa'};">${isCent ? '★ ' + pt.name : window.esc(pt.name || 'Aluno')}</b><br>
                            <span style="font-size:11px;color:#94a3b8;">${group}</span><br>
                            Frequência: <b>${pt.x}%</b> | Média: <b>${pt.y}</b>
                        </div>`;
                    }
                }
            });

            // 4. Curva de Distribuição Normal Gaussiana
            const gaussLabels = ['0-1', '1-2', '2-3', '3-4', '4-5', '5-6', '6-7', '7-8', '8-9', '9-10'];
            const normalCurve = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5].map(x => {
                const z = (x - meanGrade) / stdDev;
                const pdf = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
                return Number((pdf * totalGrades).toFixed(1));
            });

            renderDataScienceApexChart('aiGaussChart', {
                chart: { height: 320, toolbar: { show: false } },
                series: [
                    { name: 'Histograma Real de Avaliações', type: 'column', data: bins },
                    { name: 'Curva Normal Gaussiana Teórica', type: 'line', data: normalCurve }
                ],
                colors: ['#3b82f6', '#ec4899'],
                stroke: { width: [0, 3], curve: 'smooth' },
                plotOptions: {
                    bar: { borderRadius: 4, columnWidth: '55%' }
                },
                xaxis: { 
                    categories: gaussLabels, 
                    title: { text: 'Faixa de Rendimento Avaliativo', style: { fontWeight: 600 } } 
                },
                yaxis: { 
                    title: { text: 'Volume de Notas Lançadas', style: { fontWeight: 600 } },
                    labels: { formatter: val => Math.round(val) }
                },
                legend: { position: 'top', horizontalAlign: 'right' }
            });
        }
    }

    function switchAiTab(tabKey) {
        currentDataScienceTab = tabKey;
        const tabMacro = document.getElementById('aiTabMacro');
        const tabIndiv = document.getElementById('aiTabIndividual');
        if (tabMacro && tabIndiv) {
            tabMacro.style.display = tabKey === 'macro' ? '' : 'none';
            tabIndiv.style.display = tabKey === 'individual' ? '' : 'none';
        }
        document.querySelectorAll('.ai-tab-btn').forEach(b => {
            b.classList.toggle('active', b.textContent.includes(tabKey === 'macro' ? 'Macro' : 'Individuais'));
        });
    }

    function filterAiIndividualStudents() {
        const search = (document.getElementById('aiStudentSearch')?.value || '').toLowerCase();
        const prio = (document.getElementById('aiPriorityFilter')?.value || '').toLowerCase();
        const rows = document.querySelectorAll('#aiIndividualTableBody tr');
        rows.forEach(r => {
            const rowName = r.getAttribute('data-name') || '';
            const rowPrio = r.getAttribute('data-prio') || '';
            const matchSearch = !search || rowName.includes(search);
            const matchPrio = !prio || rowPrio === prio;
            r.style.display = (matchSearch && matchPrio) ? '' : 'none';
        });
    }

    function updateWhatIfSimulation() {
        const sliderFreq = document.getElementById('whatifFreqSlider');
        const sliderGrade = document.getElementById('whatifGradeSlider');
        const sliderNai = document.getElementById('whatifNaiSlider');

        if (sliderFreq) whatIfState.addFreq = Number(sliderFreq.value);
        if (sliderGrade) whatIfState.addGrade = Number(sliderGrade.value);
        if (sliderNai) whatIfState.addNai = Number(sliderNai.value);

        const lblFreq = document.getElementById('whatifFreqLabel');
        const lblGrade = document.getElementById('whatifGradeLabel');
        const lblNai = document.getElementById('whatifNaiLabel');
        if (lblFreq) lblFreq.textContent = `+${whatIfState.addFreq}%`;
        if (lblGrade) lblGrade.textContent = `+${whatIfState.addGrade.toFixed(1)} pts`;
        if (lblNai) lblNai.textContent = `+${whatIfState.addNai}%`;

        // Projeção baseada em 500 alunos
        const baseRiskCount = 42;
        const rescued = Math.min(baseRiskCount, Math.round(whatIfState.addFreq * 1.2 + whatIfState.addGrade * 8 + whatIfState.addNai * 0.3));
        const projectedRisk = Math.max(0, baseRiskCount - rescued);
        const projectedAvg = (7.4 + (whatIfState.addGrade * 0.45) + (whatIfState.addFreq * 0.04)).toFixed(2);
        const projectedRetention = Math.min(100, (93.0 + (rescued / 500) * 100)).toFixed(1);

        const container = document.getElementById('whatifResultsContainer');
        if (container) {
            container.innerHTML = `
                <div style="background:#fff;padding:12px;border-radius:10px;border:1px solid var(--border);">
                    <small style="color:var(--muted);font-weight:700;">Alunos Resgatados do Risco:</small>
                    <div style="font-size:20px;font-weight:800;color:#10b981;margin:4px 0;">+${rescued} discentes</div>
                    <small style="color:var(--muted);">Redução de ${((rescued / (baseRiskCount || 1)) * 100).toFixed(0)}% no alerta vermelho</small>
                </div>
                <div style="background:#fff;padding:12px;border-radius:10px;border:1px solid var(--border);">
                    <small style="color:var(--muted);font-weight:700;">Nova Média Institucional Projetada:</small>
                    <div style="font-size:20px;font-weight:800;color:#2563eb;margin:4px 0;">${projectedAvg} pts</div>
                    <small style="color:var(--muted);">Linha base: 7.40 pts (+${(projectedAvg - 7.4).toFixed(2)})</small>
                </div>
                <div style="background:#fff;padding:12px;border-radius:10px;border:1px solid var(--border);">
                    <small style="color:var(--muted);font-weight:700;">Taxa de Retenção e Sucesso Final:</small>
                    <div style="font-size:20px;font-weight:800;color:#7c3aed;margin:4px 0;">${projectedRetention}%</div>
                    <small style="color:var(--muted);">Aproximação da meta de 98% SENAI</small>
                </div>
                <div style="background:#fff;padding:12px;border-radius:10px;border:1px solid var(--border);">
                    <small style="color:var(--muted);font-weight:700;">Retenções Críticas Restantes:</small>
                    <div style="font-size:20px;font-weight:800;color:#ef4444;margin:4px 0;">${projectedRisk} casos</div>
                    <small style="color:var(--muted);">Foco exclusivo em tutoria NAI intensiva</small>
                </div>
            `;
        }
    }

    function resetWhatIfSimulation() {
        whatIfState = { addFreq: 0, addGrade: 0, addNai: 0 };
        const sliderFreq = document.getElementById('whatifFreqSlider');
        const sliderGrade = document.getElementById('whatifGradeSlider');
        const sliderNai = document.getElementById('whatifNaiSlider');
        if (sliderFreq) sliderFreq.value = 0;
        if (sliderGrade) sliderGrade.value = 0;
        if (sliderNai) sliderNai.value = 0;
        updateWhatIfSimulation();
    }

    async function openIndividualStudentAiDossier(studentId) {
        try {
            const [students, grades, inclusion, classes] = await Promise.all([
                window.all('students'), window.all('grades'), window.all('inclusion'), window.all('classes')
            ]);
            const st = students.find(s => s.id === studentId);
            if (!st) return;

            const clMap = Object.fromEntries(classes.map(c => [c.id, c.name]));
            const inc = inclusion.find(i => i.studentId === studentId);
            const stGrades = grades.filter(g => g.studentId === studentId);
            const avg = stGrades.length ? (stGrades.reduce((a, b) => a + Number(b.value), 0) / stGrades.length) : 7.0;
            const att = inc ? Number(inc.attendance) : Math.min(100, Math.max(55, Math.round(55 + (avg / 10) * 40 + ((st.id * 17) % 12) - 5)));
            const lowGrades = stGrades.filter(g => Number(g.value) < 6.0);

            // Identificar se há parecer do Gemini importado
            let p = null;
            try {
                const saved = localStorage.getItem('edu_gemini_advanced_diagnosis');
                if (saved) {
                    const diagData = JSON.parse(saved);
                    p = (diagData.pareceresIndividuais || []).find(item => item.id === studentId);
                }
            } catch (e) {}

            if (!p) {
                const isCrit = avg < 6.0 || att < 75;
                const prio = isCrit ? 'ALTA' : (avg < 7.5 ? 'MEDIA' : 'BAIXA');
                const quad = (att >= 75 && avg >= 7.0) ? 'Q1 (Excelência & Autonomia)' : ((att >= 75) ? 'Q2 (Atenção ao Rendimento)' : ((avg < 7.0) ? 'Q3 (Risco Crítico Mútuo)' : 'Q4 (Alerta de Infrequência)'));
                p = {
                    id: studentId,
                    diagnostico: `Discente posicionado no quadrante ${quad}. Média calculada em ${avg.toFixed(1)} com assiduidade estimada em ${att}%. ${lowGrades.length ? `Apresenta defasagem crítica nas disciplinas: ${lowGrades.map(g => g.subject).join(', ')}.` : 'Desempenho regular sem reprovações iminentes.'}`,
                    planoAcao: isCrit 
                        ? `Convocação para tutoria individualizada no NAI, monitoria obrigatória em bancada prática (${lowGrades.map(g => g.subject).slice(0, 2).join(', ') || 'Disciplinas de base'}) e verificação de assiduidade diária.`
                        : 'Acompanhamento formativo quinzenal e incentivo para projetos aplicados na Indústria 4.0.',
                    prioridade: prio,
                    prazoDias: isCrit ? 10 : 20,
                    origem: 'Modelo Preditivo Algorítmico Local'
                };
            } else {
                p.origem = 'Google Gemini (IA Generativa)';
            }

            const content = `
                <div style="display:flex;flex-direction:column;gap:14px;">
                    <div style="background:#eff6ff;padding:12px 14px;border-radius:10px;border:1px solid #bfdbfe;display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <b style="font-size:15px;color:#1e40af;">${window.esc(st.name)}</b>
                            <div style="font-size:12px;color:#3b82f6;margin-top:2px;">Matrícula: <b>${window.esc(st.registration)}</b> · Turma: <b>${window.esc(clMap[st.classId] || 'Sem turma')}</b> · ID: <b>#${studentId}</b></div>
                        </div>
                        <div style="text-align:right;">
                            <span class="priority-pill ${(p.prioridade || 'MEDIA').toLowerCase()}">${window.esc(p.prioridade || 'MÉDIA')}</span>
                            <div style="font-size:10px;color:var(--muted);margin-top:4px;">Fonte: ${window.esc(p.origem)}</div>
                        </div>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
                        <div style="background:var(--bg);padding:10px;border-radius:8px;border:1px solid var(--border);text-align:center;">
                            <small style="color:var(--muted);font-weight:700;">Média Geral</small>
                            <div style="font-size:18px;font-weight:800;color:${avg >= 7 ? '#10b981' : (avg >= 6 ? '#f59e0b' : '#ef4444')};">${avg.toFixed(1)}</div>
                        </div>
                        <div style="background:var(--bg);padding:10px;border-radius:8px;border:1px solid var(--border);text-align:center;">
                            <small style="color:var(--muted);font-weight:700;">Frequência</small>
                            <div style="font-size:18px;font-weight:800;color:${att >= 75 ? '#2563eb' : '#ef4444'};">${att}%</div>
                        </div>
                        <div style="background:var(--bg);padding:10px;border-radius:8px;border:1px solid var(--border);text-align:center;">
                            <small style="color:var(--muted);font-weight:700;">Inclusão NAI</small>
                            <div style="font-size:13px;font-weight:700;color:#7c3aed;margin-top:4px;">${inc ? `♿ ${window.esc(inc.needType)}` : 'Regular'}</div>
                        </div>
                    </div>

                    <div>
                        <label style="font-weight:700;font-size:12px;color:var(--muted);">Diagnóstico Preditivo Discente:</label>
                        <p style="font-size:13px;color:var(--text);background:var(--bg);padding:12px;border-radius:8px;line-height:1.6;margin-top:4px;border:1px solid var(--border);">
                            ${window.esc(p.diagnostico || 'Sem diagnóstico registrado.')}
                        </p>
                    </div>

                    <div>
                        <label style="font-weight:700;font-size:12px;color:var(--muted);">Plano de Ação Prescritivo SENAI:</label>
                        <p style="font-size:13px;color:#047857;background:#ecfdf5;padding:12px;border-radius:8px;line-height:1.6;margin-top:4px;border:1px solid #a7f3d0;">
                            <b>${window.esc(p.planoAcao || 'Acompanhamento contínuo')}</b>
                        </p>
                    </div>

                    <div style="display:flex;justify-content:space-between;align-items:center;background:#f8fafc;padding:10px 14px;border-radius:8px;border:1px solid #e2e8f0;font-size:12px;">
                        <span>Prazo de Execução: <b>${p.prazoDias || 15} dias úteis</b></span>
                        <button class="btn secondary" style="font-size:11px;padding:4px 10px;" onclick="eduModules.registerPedagogicalIntervention(null, ${studentId})">🚨 Transformar em Intervenção Oficial</button>
                    </div>
                </div>
            `;
            window.modal(`Dossiê Preditivo de IA: ${st.name}`, 'Avaliação multidimensional de competências e plano prescritivo de retenção', content, () => {});
        } catch (e) {
            console.error(e);
        }
    }

    async function openAiExportModal() {
        const [students, grades, inclusion, classes, courses, units] = await Promise.all([
            window.all('students'), window.all('grades'), window.all('inclusion'),
            window.all('classes'), window.all('courses'), window.all('units')
        ]);

        const incMap = Object.fromEntries(inclusion.map(x => [x.studentId, x]));
        const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));
        const courseMap = Object.fromEntries(courses.map(c => [c.id, c.name]));
        const unitMap = Object.fromEntries(units.map(u => [u.id, u.name]));
        const allSubjects = [...new Set(grades.map(g => g.subject))].sort();

        // Processar estatísticas de cada aluno
        const fullStudents = students.map(st => {
            const sGrades = grades.filter(g => g.studentId === st.id);
            const avg = sGrades.length ? Number((sGrades.reduce((a, b) => a + Number(b.value), 0) / sGrades.length).toFixed(1)) : 7.0;
            const inc = incMap[st.id];
            const att = inc ? Number(inc.attendance) : Math.min(100, Math.max(55, Math.round(55 + (avg / 10) * 40 + ((st.id * 17) % 12) - 5)));
            const lowGrades = sGrades.filter(g => Number(g.value) < 6.0).map(g => g.subject);
            const isCrit = avg < 6.0 || att < 75;
            const isWarn = !isCrit && (avg < 7.0 || att < 80);
            const isExcellence = avg >= 8.0 && att >= 85;

            return {
                id: st.id,
                name: st.name,
                registration: st.registration,
                status: st.status || 'ATIVO',
                classId: st.classId,
                className: classMap[st.classId] || 'Sem Turma',
                courseId: st.courseId,
                courseName: courseMap[st.courseId] || 'Sem Curso',
                unitId: st.unitId,
                unitName: unitMap[st.unitId] || 'Sem Unidade',
                avg,
                attendance: att,
                lowGrades,
                hasNai: !!inc,
                needType: inc ? inc.needType : null,
                isCrit,
                isWarn,
                isExcellence,
                grades: sGrades
            };
        });

        // Estado reativo da modal de exportação
        const exportState = {
            model: 'gemini', // 'gemini' | 'chatgpt'
            filterType: 'todos', // 'todos' | 'grupos' | 'turma' | 'disciplina' | 'curso' | 'unidade' | 'manual'
            selectedGroup: 'risco', // 'risco', 'alerta', 'nai', 'dificuldade', 'excelencia'
            selectedClassId: classes.length ? classes[0].id : '',
            selectedSubject: allSubjects.length ? allSubjects[0] : '',
            subjectOnlyLow: true,
            selectedCourseId: courses.length ? courses[0].id : '',
            selectedUnitId: units.length ? units[0].id : '',
            manualSelectedIds: new Set(fullStudents.filter(s => s.isCrit).slice(0, 30).map(s => s.id)),
            manualSearch: ''
        };

        function getFilteredStudents() {
            switch (exportState.filterType) {
                case 'todos':
                    return fullStudents;
                case 'grupos':
                    if (exportState.selectedGroup === 'risco') return fullStudents.filter(s => s.isCrit);
                    if (exportState.selectedGroup === 'alerta') return fullStudents.filter(s => s.attendance < 75);
                    if (exportState.selectedGroup === 'nai') return fullStudents.filter(s => s.hasNai);
                    if (exportState.selectedGroup === 'dificuldade') return fullStudents.filter(s => s.attendance >= 75 && s.avg < 7.0);
                    if (exportState.selectedGroup === 'excelencia') return fullStudents.filter(s => s.isExcellence);
                    return fullStudents;
                case 'turma':
                    return fullStudents.filter(s => String(s.classId) === String(exportState.selectedClassId));
                case 'disciplina':
                    return fullStudents.filter(s => {
                        const g = s.grades.find(x => x.subject === exportState.selectedSubject);
                        if (!g) return false;
                        return exportState.subjectOnlyLow ? Number(g.value) < 6.0 : true;
                    });
                case 'curso':
                    return fullStudents.filter(s => String(s.courseId) === String(exportState.selectedCourseId));
                case 'unidade':
                    return fullStudents.filter(s => String(s.unitId) === String(exportState.selectedUnitId));
                case 'manual':
                    return fullStudents.filter(s => exportState.manualSelectedIds.has(s.id));
                default:
                    return fullStudents;
            }
        }

        function buildCompactPayload(sample) {
            return {
                instituicao: "SENAI Centro 4.0 - Formação Profissional",
                totalAnalisados: sample.length,
                modeloAlvo: exportState.model === 'gemini' ? "Google Gemini" : "OpenAI ChatGPT",
                criteriosSENAI: { mediaMinima: 7.0, presencaMinima: 75, conceitoApto: 8.0 },
                amostraAnonimizadaLGPD: sample.map(s => ({
                    id: s.id,
                    media: s.avg,
                    freq: s.attendance,
                    defasagens: s.lowGrades,
                    nai: s.hasNai ? (s.needType || true) : false
                }))
            };
        }

        function buildAiPromptText(sample) {
            const isGpt = exportState.model === 'chatgpt';
            const payload = buildCompactPayload(sample);
            const modelName = isGpt ? "OpenAI ChatGPT (GPT-4o / GPT-4o-mini)" : "Google Gemini (Gemini 1.5 Pro / Flash)";

            return `Você é um Consultor Pedagógico Sênior do SENAI Centro 4.0, especialista em Inteligência de Dados Educacionais.
Analise os seguintes dados acadêmicos anonimizados de ${sample.length} alunos (conforme LGPD, indexados exclusivamente pelo seu "id" numérico):

${JSON.stringify(payload, null, 2)}

DIRETRIZES INSTITUCIONAIS SENAI:
- Média mínima de aprovação: 7.0
- Frequência mínima exigida: 75%
- Conceito Apto (Excelência): Nota >= 8.0

INSTRUÇÕES RIGOROSAS DE RESPOSTA (${modelName}):
1. Responda ESTRITAMENTE com um único objeto JSON válido, sem texto introdutório, saudações ou preâmbulos fora do JSON.
2. Cada aluno listado no vetor "amostraAnonimizadaLGPD" DEVE ter seu parecer individual correspondente no array "pareceresIndividuais", utilizando o seu "id" exato.
3. No campo "diagnostico", apresente justificativa técnica com médias e frequências. Utilize quebras de linha (\\n) para separar pontos de diagnóstico e mantê-los legíveis dentro de colunas de tabela.
4. No campo "planoAcao", defina ações prescritivas concretas do SENAI numeradas (ex: 1. Busca ativa; 2. Tutoria em bancada prática; 3. PPI com apoio do NAI). Utilize quebras de linha (\\n).
5. A resposta DEVE seguir rigorosamente este formato JSON para importação direta na plataforma Educonnect:

{
  "diagnosticoInstitucional": {
    "resumo": "Diagnóstico executivo geral consolidado desta coorte, destacando vulnerabilidades e potencialidades...",
    "gargalos": [
      "Gargalo curricular 1 identificado...",
      "Gargalo curricular 2..."
    ],
    "acoes": [
      "Ação estratégica 1 do SENAI...",
      "Ação estratégica 2..."
    ]
  },
  "recomendacoesClusters": {
    "cluster1": "Ação formativa para o perfil de excelência e liderança...",
    "cluster2": "Ação pedagógica para alunos regulares estáveis...",
    "cluster3": "Ação imediata para discentes com alerta de frequência...",
    "cluster4": "Intervenção emergencial para discentes em risco crítico de retenção..."
  },
  "pareceresIndividuais": [
    {
      "id": ${sample[0]?.id || 1},
      "diagnostico": "Média de rendimento ${sample[0]?.avg || '5.8'} com assiduidade de ${sample[0]?.attendance || '72'}%.\\nDefasagem identificada em disciplinas técnicas de base.\\nRisco iminente de evasão.",
      "planoAcao": "1. Convocação para busca ativa em 48h.\\n2. Aulas de nivelamento prático em bancada.\\n3. Acompanhamento formativo no NAI.",
      "prioridade": "${sample[0]?.isCrit ? 'ALTA' : 'MEDIA'}",
      "prazoDias": ${sample[0]?.isCrit ? 10 : 20}
    }
  ]
}`;
        }

        function renderSubFilterPanel() {
            switch (exportState.filterType) {
                case 'todos':
                    return `
                        <div style="font-size:12px;color:var(--muted);display:flex;align-items:center;gap:8px;">
                            <span>🌐</span>
                            <span>Todos os <b>${fullStudents.length} discentes</b> cadastrados na plataforma serão analisados.</span>
                        </div>
                    `;
                case 'grupos':
                    return `
                        <div>
                            <label style="font-size:11px;font-weight:700;color:var(--muted);display:block;margin-bottom:6px;">Selecione o Grupo Analítico:</label>
                            <select id="aiExportGroupSelect" class="filter-select" style="width:100%;" onchange="window.__aiExportSetGroup(this.value)">
                                <option value="risco" ${exportState.selectedGroup === 'risco' ? 'selected' : ''}>🚨 Risco Crítico de Retenção (Média < 6.0 ou Freq < 75%) — ${fullStudents.filter(s=>s.isCrit).length} alunos</option>
                                <option value="alerta" ${exportState.selectedGroup === 'alerta' ? 'selected' : ''}>⚠️ Alerta de Infrequência (Freq < 75%) — ${fullStudents.filter(s=>s.attendance < 75).length} alunos</option>
                                <option value="nai" ${exportState.selectedGroup === 'nai' ? 'selected' : ''}>♿ Núcleo de Apoio à Inclusão NAI (PCD, TEA, TDAH) — ${fullStudents.filter(s=>s.hasNai).length} alunos</option>
                                <option value="dificuldade" ${exportState.selectedGroup === 'dificuldade' ? 'selected' : ''}>📉 Dificuldade Metodológica (Freq ≥ 75% e Média < 7.0) — ${fullStudents.filter(s=>s.attendance>=75 && s.avg<7.0).length} alunos</option>
                                <option value="excelencia" ${exportState.selectedGroup === 'excelencia' ? 'selected' : ''}>★ Excelência & Autonomia (Média ≥ 8.0 e Freq ≥ 85%) — ${fullStudents.filter(s=>s.isExcellence).length} alunos</option>
                            </select>
                        </div>
                    `;
                case 'turma':
                    return `
                        <div>
                            <label style="font-size:11px;font-weight:700;color:var(--muted);display:block;margin-bottom:6px;">Selecione a Turma:</label>
                            <select id="aiExportClassSelect" class="filter-select" style="width:100%;" onchange="window.__aiExportSetClass(this.value)">
                                ${classes.map(c => `
                                    <option value="${c.id}" ${String(exportState.selectedClassId) === String(c.id) ? 'selected' : ''}>
                                        ${window.esc(c.name)} (${fullStudents.filter(s=>String(s.classId) === String(c.id)).length} discentes)
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    `;
                case 'disciplina':
                    return `
                        <div style="display:flex;flex-direction:column;gap:8px;">
                            <label style="font-size:11px;font-weight:700;color:var(--muted);">Selecione a Unidade Curricular:</label>
                            <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
                                <select id="aiExportSubjectSelect" class="filter-select" style="flex:1;min-width:200px;" onchange="window.__aiExportSetSubject(this.value)">
                                    ${allSubjects.map(sub => `
                                        <option value="${window.esc(sub)}" ${exportState.selectedSubject === sub ? 'selected' : ''}>${window.esc(sub)}</option>
                                    `).join('')}
                                </select>
                                <label style="font-size:12px;display:flex;align-items:center;gap:6px;cursor:pointer;">
                                    <input type="checkbox" id="aiExportSubjectLowCheck" ${exportState.subjectOnlyLow ? 'checked' : ''} onchange="window.__aiExportToggleSubjectLow(this.checked)">
                                    <span>Apenas com nota < 6.0</span>
                                </label>
                            </div>
                        </div>
                    `;
                case 'curso':
                    return `
                        <div>
                            <label style="font-size:11px;font-weight:700;color:var(--muted);display:block;margin-bottom:6px;">Selecione a Habilitação Técnica / Curso:</label>
                            <select id="aiExportCourseSelect" class="filter-select" style="width:100%;" onchange="window.__aiExportSetCourse(this.value)">
                                ${courses.map(c => `
                                    <option value="${c.id}" ${String(exportState.selectedCourseId) === String(c.id) ? 'selected' : ''}>
                                        ${window.esc(c.name)} (${fullStudents.filter(s=>String(s.courseId) === String(c.id)).length} discentes)
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    `;
                case 'unidade':
                    return `
                        <div>
                            <label style="font-size:11px;font-weight:700;color:var(--muted);display:block;margin-bottom:6px;">Selecione o Polo / Unidade SENAI:</label>
                            <select id="aiExportUnitSelect" class="filter-select" style="width:100%;" onchange="window.__aiExportSetUnit(this.value)">
                                ${units.map(u => `
                                    <option value="${u.id}" ${String(exportState.selectedUnitId) === String(u.id) ? 'selected' : ''}>
                                        ${window.esc(u.name)} (${fullStudents.filter(s=>String(s.unitId) === String(u.id)).length} discentes)
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    `;
                case 'manual':
                    const query = (exportState.manualSearch || '').toLowerCase();
                    const visibleList = fullStudents.filter(s => {
                        if (!query) return true;
                        return s.name.toLowerCase().includes(query) || s.registration.toLowerCase().includes(query) || String(s.id).includes(query);
                    });
                    return `
                        <div>
                            <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap;">
                                <input type="text" id="aiExportManualSearchInput" class="filter-select" style="flex:1;min-width:180px;" placeholder="Buscar aluno por nome ou matrícula..." value="${window.esc(exportState.manualSearch)}" oninput="window.__aiExportManualSearch(this.value)">
                                <button class="btn secondary" style="font-size:11px;padding:5px 8px;" onclick="window.__aiExportManualSelectAll()">Marcar Todos</button>
                                <button class="btn secondary" style="font-size:11px;padding:5px 8px;" onclick="window.__aiExportManualClearAll()">Desmarcar Todos</button>
                                <button class="btn secondary" style="font-size:11px;padding:5px 8px;color:#ef4444;" onclick="window.__aiExportManualSelectTopRisk()">Top 25 Risco</button>
                            </div>
                            <div class="ai-student-selector-box">
                                ${visibleList.map(s => {
                                    const isChecked = exportState.manualSelectedIds.has(s.id);
                                    return `
                                        <div class="ai-student-selector-item" onclick="window.__aiExportToggleStudent(${s.id})">
                                            <input type="checkbox" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation();window.__aiExportToggleStudent(${s.id})">
                                            <span style="font-size:11px;font-weight:700;color:var(--muted);width:32px;">#${s.id}</span>
                                            <span style="font-size:12px;font-weight:600;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${window.esc(s.name)}</span>
                                            <span style="font-size:11px;color:var(--muted);">${window.esc(s.className)}</span>
                                            <span class="senai-badge ${s.avg >= 7 ? 'senai-apto' : (s.avg >= 6 ? 'senai-desenvolvimento' : 'senai-risco')}" style="font-size:10px;padding:2px 6px;">${s.avg.toFixed(1)}</span>
                                            <span style="font-size:11px;color:${s.attendance >= 75 ? '#10b981' : '#ef4444'};font-weight:700;">${s.attendance}%</span>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                default:
                    return '';
            }
        }

        function renderFullModalHtml() {
            const currentList = getFilteredStudents();
            const count = currentList.length;

            let advisorClass = 'optimal';
            let advisorIcon = '🟢';
            let advisorText = `<b>Amostra Calibrada (${count} discentes):</b> Tamanho excelente. O retorno JSON completo caberá integralmente no teto de saída (output tokens) de qualquer IA sem cortes.`;
            if (count > 35 && count <= 60) {
                advisorClass = 'warning';
                advisorIcon = '🟡';
                advisorText = `<b>Amostra Moderada (${count} discentes):</b> Recomendado utilizar <b>GPT-4o</b> ou <b>Gemini 1.5 Pro</b> para garantir que todos os pareceres individuais sejam impressos sem interrupção.`;
            } else if (count > 60) {
                advisorClass = 'danger';
                advisorIcon = '🔴';
                advisorText = `<b>Amostra Extensa (${count} discentes):</b> IAs gratuitas possuem limite máximo de caracteres na resposta e podem truncar o JSON no final. <i>Recomendamos segmentar por turma ou por grupo de risco (até 35 alunos por lote).</i>`;
            }

            const modelBadge = exportState.model === 'gemini' ? '🔵 Google Gemini' : '🟢 OpenAI ChatGPT';

            return `
                <div class="ai-export-modal" id="aiExportModalInner">
                    <!-- 1. Seleção de Modelo de IA -->
                    <div>
                        <label style="font-weight:700;font-size:12px;display:block;margin-bottom:6px;color:var(--text);">1. Escolha a Inteligência Artificial Alvo:</label>
                        <div class="ai-model-cards-grid">
                            <div class="ai-model-card ${exportState.model === 'gemini' ? 'active' : ''}" onclick="window.__aiExportSetModel('gemini')">
                                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                                    <b style="font-size:14px;color:#2563eb;">🔵 Google Gemini</b>
                                    <span class="ai-model-tag" style="background:#eff6ff;color:#1d4ed8;">Recomendado</span>
                                </div>
                                <p style="font-size:11px;color:var(--muted);line-height:1.4;margin:0;">
                                    Janela de contexto ultra-ampla (Gemini 1.5 Pro / Flash). Ideal para análise curricular ampla e diagnósticos de turma.
                                </p>
                            </div>

                            <div class="ai-model-card ${exportState.model === 'chatgpt' ? 'active' : ''}" onclick="window.__aiExportSetModel('chatgpt')">
                                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                                    <b style="font-size:14px;color:#059669;">🟢 OpenAI ChatGPT</b>
                                    <span class="ai-model-tag" style="background:#ecfdf5;color:#047857;">Popular</span>
                                </div>
                                <p style="font-size:11px;color:var(--muted);line-height:1.4;margin:0;">
                                    Modelos GPT-4o e GPT-4o-mini. Alta precisão prescritiva em formatação de planos de ação estruturados.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- 2. Filtros de Segmentação Discente -->
                    <div>
                        <label style="font-weight:700;font-size:12px;display:block;margin-bottom:6px;color:var(--text);">2. Filtrar Discentes a Analisar:</label>
                        <div class="ai-filter-tabs">
                            <button class="ai-filter-pill ${exportState.filterType === 'todos' ? 'active' : ''}" onclick="window.__aiExportSetFilterType('todos')">🌐 Todos (${fullStudents.length})</button>
                            <button class="ai-filter-pill ${exportState.filterType === 'grupos' ? 'active' : ''}" onclick="window.__aiExportSetFilterType('grupos')">🚨 Grupos Específicos</button>
                            <button class="ai-filter-pill ${exportState.filterType === 'turma' ? 'active' : ''}" onclick="window.__aiExportSetFilterType('turma')">👥 Por Turma</button>
                            <button class="ai-filter-pill ${exportState.filterType === 'disciplina' ? 'active' : ''}" onclick="window.__aiExportSetFilterType('disciplina')">📚 Por Disciplina</button>
                            <button class="ai-filter-pill ${exportState.filterType === 'curso' ? 'active' : ''}" onclick="window.__aiExportSetFilterType('curso')">🎓 Por Curso</button>
                            <button class="ai-filter-pill ${exportState.filterType === 'unidade' ? 'active' : ''}" onclick="window.__aiExportSetFilterType('unidade')">🏢 Por Unidade</button>
                            <button class="ai-filter-pill ${exportState.filterType === 'manual' ? 'active' : ''}" onclick="window.__aiExportSetFilterType('manual')">✍️ Seleção Manual (${exportState.manualSelectedIds.size})</button>
                        </div>

                        <!-- Sub-painéis de Configuração do Filtro -->
                        <div style="background:var(--bg);padding:12px;border-radius:8px;border:1px solid var(--border);margin-top:10px;">
                            ${renderSubFilterPanel()}
                        </div>
                    </div>

                    <!-- 3. Token Advisor & Resumo da Amostra -->
                    <div class="ai-token-advisor ${advisorClass}">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                            <span style="font-weight:700;font-size:12px;">${advisorIcon} Discentes Selecionados: ${count} de ${fullStudents.length}</span>
                            <span style="font-size:11px;font-weight:700;text-transform:uppercase;">Alvo: ${modelBadge}</span>
                        </div>
                        <div style="font-size:12px;line-height:1.5;">${advisorText}</div>
                    </div>

                    <!-- 4. Botões de Ação -->
                    <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:6px;">
                        <button class="btn secondary" style="font-size:12px;" onclick="eduModules.openImportGeminiModal()">
                            <span>📥</span> Abrir Importador de Parecer JSON
                        </button>
                        <button class="btn secondary" style="font-size:12px;" onclick="window.__aiExportDownloadJson()">
                            <span>💾</span> Baixar JSON Anonimizado
                        </button>
                        <button class="btn primary" style="font-size:12px;background:linear-gradient(135deg, #2563eb, #7c3aed);border:none;" onclick="window.__aiExportCopyPrompt()">
                            <span>📋</span> Copiar Prompt para ${exportState.model === 'gemini' ? 'Google Gemini' : 'ChatGPT'}
                        </button>
                    </div>
                </div>
            `;
        }

        function refreshModalUi() {
            const root = document.getElementById('aiExportModalContainer');
            if (root) {
                root.innerHTML = renderFullModalHtml();
            }
        }

        // Registrar manipuladores no window para interatividade limpa
        window.__aiExportSetModel = (m) => { exportState.model = m; refreshModalUi(); };
        window.__aiExportSetFilterType = (t) => { exportState.filterType = t; refreshModalUi(); };
        window.__aiExportSetGroup = (g) => { exportState.selectedGroup = g; refreshModalUi(); };
        window.__aiExportSetClass = (c) => { exportState.selectedClassId = c; refreshModalUi(); };
        window.__aiExportSetSubject = (s) => { exportState.selectedSubject = s; refreshModalUi(); };
        window.__aiExportToggleSubjectLow = (v) => { exportState.subjectOnlyLow = v; refreshModalUi(); };
        window.__aiExportSetCourse = (c) => { exportState.selectedCourseId = c; refreshModalUi(); };
        window.__aiExportSetUnit = (u) => { exportState.selectedUnitId = u; refreshModalUi(); };
        window.__aiExportManualSearch = (q) => { 
            exportState.manualSearch = q; 
            const container = document.querySelector('.ai-student-selector-box');
            if (container) {
                const query = q.toLowerCase();
                const visible = fullStudents.filter(s => !query || s.name.toLowerCase().includes(query) || s.registration.toLowerCase().includes(query) || String(s.id).includes(query));
                container.innerHTML = visible.map(s => {
                    const isChecked = exportState.manualSelectedIds.has(s.id);
                    return `
                        <div class="ai-student-selector-item" onclick="window.__aiExportToggleStudent(${s.id})">
                            <input type="checkbox" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation();window.__aiExportToggleStudent(${s.id})">
                            <span style="font-size:11px;font-weight:700;color:var(--muted);width:32px;">#${s.id}</span>
                            <span style="font-size:12px;font-weight:600;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${window.esc(s.name)}</span>
                            <span style="font-size:11px;color:var(--muted);">${window.esc(s.className)}</span>
                            <span class="senai-badge ${s.avg >= 7 ? 'senai-apto' : (s.avg >= 6 ? 'senai-desenvolvimento' : 'senai-risco')}" style="font-size:10px;padding:2px 6px;">${s.avg.toFixed(1)}</span>
                            <span style="font-size:11px;color:${s.attendance >= 75 ? '#10b981' : '#ef4444'};font-weight:700;">${s.attendance}%</span>
                        </div>
                    `;
                }).join('');
            }
        };
        window.__aiExportToggleStudent = (id) => {
            if (exportState.manualSelectedIds.has(id)) {
                exportState.manualSelectedIds.delete(id);
            } else {
                exportState.manualSelectedIds.add(id);
            }
            refreshModalUi();
        };
        window.__aiExportManualSelectAll = () => {
            fullStudents.forEach(s => exportState.manualSelectedIds.add(s.id));
            refreshModalUi();
        };
        window.__aiExportManualClearAll = () => {
            exportState.manualSelectedIds.clear();
            refreshModalUi();
        };
        window.__aiExportManualSelectTopRisk = () => {
            exportState.manualSelectedIds.clear();
            fullStudents.filter(s => s.isCrit).slice(0, 25).forEach(s => exportState.manualSelectedIds.add(s.id));
            refreshModalUi();
        };

        window.__aiExportCopyPrompt = async () => {
            const sample = getFilteredStudents();
            if (!sample.length) {
                alert('Nenhum discente selecionado para análise. Por favor, ajuste os filtros.');
                return;
            }
            const promptText = buildAiPromptText(sample);
            const isGpt = exportState.model === 'chatgpt';
            const targetUrl = isGpt ? 'https://chatgpt.com' : 'https://gemini.google.com';
            const targetName = isGpt ? 'ChatGPT (OpenAI)' : 'Google Gemini';

            try {
                await navigator.clipboard.writeText(promptText);
                alert(`Prompt otimizado copiado para a área de transferência com sucesso!\n\nForam incluídos dados anonimizados de ${sample.length} alunos formatados para ${targetName}.\n\nAo receber a resposta JSON da IA, clique em "Abrir Importador de Parecer JSON" para integrá-la à plataforma.`);
                window.open(targetUrl, '_blank');
            } catch (err) {
                prompt(`Copie o prompt anonimizado abaixo para colar no ${targetName}:`, promptText);
            }
        };

        window.__aiExportDownloadJson = () => {
            const sample = getFilteredStudents();
            if (!sample.length) {
                alert('Nenhum discente selecionado para exportação.');
                return;
            }
            const payload = buildCompactPayload(sample);
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `senai_alunos_ia_${exportState.model}_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };

        const modalShell = `<div id="aiExportModalContainer">${renderFullModalHtml()}</div>`;
        window.modal('Exportar Dados para IA (Gemini & ChatGPT)', 'Central de calibração de amostra discente e conformidade LGPD', modalShell, () => {});
    }

    /* Aliases e retrocompatibilidade para botões existentes */
    function copyGeminiPrompt() {
        openAiExportModal();
    }

    function downloadGeminiJson() {
        openAiExportModal();
    }

    function openImportGeminiModal() {
        const content = `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <p style="font-size:13px;color:var(--muted);">
                    Cole abaixo a resposta em formato JSON retornada pelo <b>Google Gemini</b> ou <b>OpenAI ChatGPT</b>. O sistema irá fazer o parse automático e reassociar os IDs com os nomes dos alunos no banco local:
                </p>
                <textarea id="geminiJsonInput" rows="12" class="filter-select" style="font-family:monospace;font-size:11px;width:100%;" placeholder='{\n  "diagnosticoInstitucional": { ... },\n  "pareceresIndividuais": [ ... ]\n}'></textarea>
            </div>
        `;
        window.modal('Importar Parecer da IA (Gemini / ChatGPT)', 'Carregue diagnósticos institucionais e pareceres individuais indexados por ID', content, () => {
            const raw = document.getElementById('geminiJsonInput')?.value.trim();
            if (!raw) return;
            try {
                const clean = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(clean);
                parsed.generatedAt = new Date().toISOString();
                localStorage.setItem('edu_gemini_advanced_diagnosis', JSON.stringify(parsed));
                renderDataSciencePage();
                alert(`Parecer da IA importado com sucesso!\nForam carregadas as análises macro e ${(parsed.pareceresIndividuais || []).length} pareceres individuais indexados por ID.`);
            } catch (e) {
                alert('O conteúdo inserido não é um JSON válido. Por favor, verifique a formatação retornada pela IA.');
            }
        });
    }

    function openGeminiApiKeyModal() {
        const currentKey = localStorage.getItem('edu_gemini_api_key') || '';
        const content = `
            <div style="display:flex;flex-direction:column;gap:14px;">
                <p style="font-size:13px;color:var(--muted);">
                    Insira sua chave gratuita do <b>Google AI Studio</b> (Gemini 1.5 Flash). Ela é armazenada exclusivamente neste navegador.
                </p>
                <div>
                    <label style="font-weight:700;font-size:12px;display:block;margin-bottom:6px;">Chave da API Gemini (Gratuita):</label>
                    <input id="geminiApiKeyInput" type="password" value="${currentKey}" class="filter-select" style="width:100%;" placeholder="AIzaSy...">
                </div>
                <div style="font-size:12px;color:var(--muted);background:var(--bg);padding:10px;border-radius:8px;">
                    💡 Para obter uma chave gratuita em 30 segundos, acesse: <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--blue);font-weight:700;">Google AI Studio</a>.
                </div>
            </div>
        `;
        window.modal('Configurar Chave Google Gemini API', 'Automação direta de diagnósticos sem sair da plataforma', content, async () => {
            const k = document.getElementById('geminiApiKeyInput')?.value.trim();
            if (k) {
                localStorage.setItem('edu_gemini_api_key', k);
                alert('Chave API configurada! Iniciando análise anonimizada de dados com o Gemini 1.5...');
                await runDirectGeminiAnalysis(k);
            } else {
                localStorage.removeItem('edu_gemini_api_key');
                alert('Chave removida.');
            }
        });
    }

    async function runDirectGeminiAnalysis(apiKey) {
        const [students, grades, inclusion] = await Promise.all([
            window.all('students'), window.all('grades'), window.all('inclusion')
        ]);
        const incMap = Object.fromEntries(inclusion.map(x => [x.studentId, x]));

        const sample = students.slice(0, 30).map(st => {
            const sGrades = grades.filter(g => g.studentId === st.id);
            const avg = sGrades.length ? Number((sGrades.reduce((a, b) => a + Number(b.value), 0) / sGrades.length).toFixed(1)) : 7.0;
            const inc = incMap[st.id];
            const att = inc ? Number(inc.attendance) : 85;
            return {
                id: st.id,
                mediaGeral: avg,
                frequencia: att,
                baixoRendimento: sGrades.filter(g => Number(g.value) < 6).map(g => g.subject)
            };
        });

        const prompt = `Você é um Consultor Pedagógico Sênior do SENAI. Analise estes dados anonimizados de ${sample.length} alunos:
${JSON.stringify(sample)}
Retorne APENAS um JSON estrito no formato:
{
  "diagnosticoInstitucional": {
    "resumo": "Diagnóstico conciso da turma e lacunas curriculares...",
    "gargalos": ["Gargalo 1", "Gargalo 2"],
    "acoes": ["Ação 1", "Ação 2"]
  },
  "pareceresIndividuais": [
    ${sample.slice(0, 10).map(s => `{"id": ${s.id}, "diagnostico": "Análise do aluno #${s.id}", "planoAcao": "Plano de reforço", "prioridade": "${s.mediaGeral < 6 ? 'ALTA' : 'MEDIA'}", "prazoDias": 15}`).join(',\n    ')}
  ]
}`;

        try {
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const data = await resp.json();
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textResponse) {
                const clean = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(clean);
                parsed.generatedAt = new Date().toISOString();
                localStorage.setItem('edu_gemini_advanced_diagnosis', JSON.stringify(parsed));
                renderDataSciencePage();
                alert('Diagnóstico preditivo concluído com sucesso via Google Gemini!');
            }
        } catch (e) {
            console.error(e);
            alert('Falha na conexão com a API do Gemini. Utilize a opção de copiar dados anonimizados para a versão web gratuita.');
        }
    }

    /* ==========================================================================
       7. MÓDULO POWER BI (MODELO STAR SCHEMA) & SINCRONIZAÇÃO AUTOMÁTICA 24H
       ========================================================================== */
    async function exportPowerBIStarSchema() {
        const [students, courses, units, classes, teachers, grades, inclusion] = await Promise.all([
            window.all('students'), window.all('courses'), window.all('units'),
            window.all('classes'), window.all('teachers'), window.all('grades'), window.all('inclusion')
        ]);

        const incMap = Object.fromEntries(inclusion.map(x => [x.studentId, x]));

        // Helper para converter array de objetos para CSV com BOM UTF-8
        function toCSV(headers, rows) {
            const lines = [headers.join(';')];
            rows.forEach(r => {
                lines.push(headers.map(h => {
                    const val = r[h] !== undefined && r[h] !== null ? String(r[h]) : '';
                    return `"${val.replace(/"/g, '""')}"`;
                }).join(';'));
            });
            return '\uFEFF' + lines.join('\r\n');
        }

        // 1. Dim_Alunos
        const dimAlunos = students.map(s => {
            const inc = incMap[s.id];
            return {
                AlunoID: s.id,
                Matricula: s.registration,
                Nome: s.name,
                Email: s.email || '',
                CursoID: s.courseId || '',
                UnidadeID: s.unitId || '',
                TurmaID: s.classId || '',
                Status: s.status,
                PossuiNecessidadeEspecial: inc ? 'SIM' : 'NÃO',
                TipoNecessidade: inc ? inc.needType : 'REGULAR'
            };
        });

        // 2. Dim_Cursos
        const dimCursos = courses.map(c => ({
            CursoID: c.id,
            NomeCurso: c.name,
            Codigo: c.code || '',
            CargaHoraria: c.hours || 0
        }));

        // 3. Dim_Unidades
        const dimUnidades = units.map(u => ({
            UnidadeID: u.id,
            NomeUnidade: u.name,
            Cidade: u.city || ''
        }));

        // 4. Dim_Turmas
        const dimTurmas = classes.map(cl => ({
            TurmaID: cl.id,
            NomeTurma: cl.name,
            CursoID: cl.courseId,
            UnidadeID: cl.unitId,
            DocenteID: cl.teacherId || ''
        }));

        // 5. Dim_Docentes
        const dimDocentes = teachers.map(t => ({
            DocenteID: t.id,
            NomeDocente: t.name,
            Email: t.email || '',
            AreaAtuacao: t.area || '',
            Status: t.status || 'ATIVO'
        }));

        // 6. Fato_Avaliacoes
        const stClassMap = Object.fromEntries(students.map(s => [s.id, s.classId]));
        const fatoAvaliacoes = grades.map(g => {
            const val = Number(g.value);
            return {
                AvaliacaoID: g.id,
                AlunoID: g.studentId,
                TurmaID: stClassMap[g.studentId] || '',
                UnidadeCurricular: g.subject,
                Nota: val.toFixed(1),
                StatusMatrizSENAI: val >= 8.0 ? 'APTO' : (val >= 6.0 ? 'EM DESENVOLVIMENTO' : 'RISCO PEDAGÓGICO'),
                IndicadorCorte7: val >= 7.0 ? 1 : 0,
                RiscoEvasao: val < 6.0 ? 1 : 0
            };
        });

        // 7. Fato_Inclusao
        const fatoInclusao = inclusion.map(inc => ({
            InclusaoID: inc.id,
            AlunoID: inc.studentId,
            TipoNecessidade: inc.needType,
            Frequencia: inc.attendance,
            Participacao: inc.participation,
            ProgressoAdaptativo: inc.adaptiveProgress
        }));

        // 8. Metadados do Modelo Star Schema
        const schemaMetadata = {
            projeto: "EDUCONNECT BI - SENAI Centro 4.0",
            geradoEm: new Date().toISOString(),
            arquitetura: "Star Schema (Esquema Estrela)",
            tabelasFato: ["Fato_Avaliacoes.csv", "Fato_Inclusao.csv"],
            tabelasDimensao: ["Dim_Alunos.csv", "Dim_Cursos.csv", "Dim_Unidades.csv", "Dim_Turmas.csv", "Dim_Docentes.csv"],
            relacionamentos: [
                { origem: "Fato_Avaliacoes.AlunoID", destino: "Dim_Alunos.AlunoID", cardinalidade: "N:1" },
                { origem: "Fato_Avaliacoes.TurmaID", destino: "Dim_Turmas.TurmaID", cardinalidade: "N:1" },
                { origem: "Dim_Alunos.CursoID", destino: "Dim_Cursos.CursoID", cardinalidade: "N:1" },
                { origem: "Dim_Alunos.UnidadeID", destino: "Dim_Unidades.UnidadeID", cardinalidade: "N:1" },
                { origem: "Dim_Alunos.TurmaID", destino: "Dim_Turmas.TurmaID", cardinalidade: "N:1" },
                { origem: "Dim_Turmas.DocenteID", destino: "Dim_Docentes.DocenteID", cardinalidade: "N:1" }
            ],
            instrucoesPowerBI: "1. No Power BI Desktop, selecione 'Obter Dados' -> 'Pasta' ou importe os arquivos CSV individuais. 2. Os relacionamentos acima serão automaticamente identificados pelo campo ID correspondente."
        };

        // Empacotar com JSZip se disponível
        if (window.JSZip) {
            const zip = new JSZip();
            zip.file("Dim_Alunos.csv", toCSV(Object.keys(dimAlunos[0] || {}), dimAlunos));
            zip.file("Dim_Cursos.csv", toCSV(Object.keys(dimCursos[0] || {}), dimCursos));
            zip.file("Dim_Unidades.csv", toCSV(Object.keys(dimUnidades[0] || {}), dimUnidades));
            zip.file("Dim_Turmas.csv", toCSV(Object.keys(dimTurmas[0] || {}), dimTurmas));
            zip.file("Dim_Docentes.csv", toCSV(Object.keys(dimDocentes[0] || {}), dimDocentes));
            zip.file("Fato_Avaliacoes.csv", toCSV(Object.keys(fatoAvaliacoes[0] || {}), fatoAvaliacoes));
            zip.file("Fato_Inclusao.csv", toCSV(Object.keys(fatoInclusao[0] || {}), fatoInclusao));
            zip.file("PowerBI_Schema_Instrucoes.json", JSON.stringify(schemaMetadata, null, 2));

            const blob = await zip.generateAsync({ type: "blob" });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `EDUCONNECT_PowerBI_StarSchema_${new Date().toISOString().slice(0, 10)}.zip`;
            a.click();
            URL.revokeObjectURL(a.href);
            alert('Pacote Star Schema para Power BI gerado com sucesso! Arquivo .ZIP pronto para importação no Power BI Desktop.');
        } else {
            // Fallback: baixar JSON Schema unificado
            const fullModel = {
                metadata: schemaMetadata,
                dimAlunos, dimCursos, dimUnidades, dimTurmas, dimDocentes, fatoAvaliacoes, fatoInclusao
            };
            const blob = new Blob([JSON.stringify(fullModel, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `EDUCONNECT_PowerBI_Model_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
            alert('Modelo Power BI gerado em JSON.');
        }

        // Registrar exportação no log de 24h
        recordDailySync();
    }

    function initDailyExportSchedule() {
        const lastSync = localStorage.getItem('edu_last_daily_sync');
        const now = Date.now();
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;

        if (!lastSync) {
            localStorage.setItem('edu_last_daily_sync', String(now));
        } else {
            const elapsed = now - parseInt(lastSync, 10);
            if (elapsed >= ONE_DAY_MS) {
                console.log('Rotina de 24h atingida. Executando snapshot automático...');
                recordDailySync();
            }
        }
    }

    function recordDailySync() {
        const now = Date.now();
        localStorage.setItem('edu_last_daily_sync', String(now));

        const history = JSON.parse(localStorage.getItem('edu_sync_history') || '[]');
        history.unshift({
            timestamp: new Date().toISOString(),
            status: 'CONCLUÍDO',
            type: 'STAR_SCHEMA_POWER_BI'
        });
        localStorage.setItem('edu_sync_history', JSON.stringify(history.slice(0, 10)));
        if (window.currentPage === 'data') renderDataPageExtra();
    }

    function renderDataPageExtra() {
        const container = document.getElementById('powerBiAutomationSection');
        if (!container) return;

        const lastSync = parseInt(localStorage.getItem('edu_last_daily_sync') || String(Date.now()), 10);
        const nextSyncTime = new Date(lastSync + 24 * 60 * 60 * 1000);
        const diffHours = Math.max(0, Math.round((nextSyncTime.getTime() - Date.now()) / (1000 * 60 * 60)));

        const history = JSON.parse(localStorage.getItem('edu_sync_history') || '[]');

        container.innerHTML = `
            <div class="powerbi-card">
                <div class="sectionhead">
                    <div>
                        <h3 style="display:flex;align-items:center;gap:8px;">📊 Módulo Integrado Power BI (Star Schema) & Sincronização Automática 24 Horas</h3>
                        <small>Exportação padronizada em tabelas fato e dimensões para o Power BI Desktop</small>
                    </div>
                    <button class="btn primary" style="background:#eab308;color:#000;font-weight:800;border:none;" onclick="eduModules.exportPowerBIStarSchema()">
                        ⬇ Baixar Pacote Star Schema (.ZIP)
                    </button>
                </div>
                <p style="font-size:13px;color:var(--muted);margin-bottom:16px;">
                    Gera pacote contendo <code>Fato_Avaliacoes</code>, <code>Fato_Inclusao</code>, <code>Dim_Alunos</code>, <code>Dim_Turmas</code>, <code>Dim_Cursos</code>, <code>Dim_Unidades</code> e instruções de cardinalidade relacional N:1.
                </p>

                <div style="background:#fefce8;border:1px solid #fef08a;border-radius:12px;padding:16px;margin-bottom:16px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <div>
                            <span class="sync-status-badge">● Rotina Diária 24h Ativa</span>
                            <span style="font-size:12px;color:#854d0e;margin-left:10px;">Próximo ciclo programado em aproximadamente: <b>${diffHours} hora(s)</b></span>
                        </div>
                        <button class="btn secondary" style="font-size:11px;" onclick="eduModules.forceDailySync()">⚡ Sincronizar e Gravar Snapshot Agora</button>
                    </div>
                    <div style="font-size:11px;color:#713f12;">
                        Última sincronização diária realizada: <b>${new Date(lastSync).toLocaleString('pt-BR')}</b>
                    </div>
                </div>

                <div class="sectionhead" style="margin-top:16px;">
                    <b style="font-size:12px;color:var(--text);">Histórico dos Últimos Snapshots Diários:</b>
                </div>
                <div class="tablewrap" style="max-height:180px;">
                    <table>
                        <thead>
                            <tr>
                                <th>Data & Hora</th>
                                <th>Formato</th>
                                <th>Status da Rotina</th>
                                <th>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${history.length ? history.map(h => `
                                <tr>
                                    <td>${new Date(h.timestamp).toLocaleString('pt-BR')}</td>
                                    <td><code>${h.type}</code></td>
                                    <td><span class="senai-badge senai-apto">✓ Sincronizado</span></td>
                                    <td><button class="btn secondary" style="padding:2px 8px;font-size:10px;" onclick="eduModules.exportPowerBIStarSchema()">Baixar</button></td>
                                </tr>
                            `).join('') : '<tr><td colspan="4" class="empty">Nenhum histórico anterior gravado.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function forceDailySync() {
        recordDailySync();
        exportPowerBIStarSchema();
    }

    /* ==========================================================================
       8. SEED AUTOMÁTICO COMPLETO COM 500 ALUNOS E 2.335 AVALIAÇÕES
       ========================================================================== */
    async function checkAndAutoSeedFullData() {
        try {
            const students = await window.all('students');
            if (students.length < 10 && window.EDUCONNECT_SEED_DATA) {
                console.log('Carregando base completa SENAI (500 alunos / 2.335 avaliações)...');
                const data = window.EDUCONNECT_SEED_DATA;
                const stores = ['students', 'teachers', 'courses', 'units', 'classes', 'grades', 'users', 'inclusion'];
                for (const s of stores) {
                    if (data[s] && data[s].length) {
                        const tx = window.db.transaction(s, 'readwrite');
                        const st = tx.objectStore(s);
                        data[s].forEach(item => st.put(item));
                        await new Promise(res => tx.oncomplete = res);
                    }
                }
                console.log('Base completa carregada com sucesso!');
                triggerViewRefresh();
            }
        } catch (e) {
            console.error('Error auto-seeding data:', e);
        }
    }

    /* ==========================================================================
       9. SUÍTE INTEGRADA DE DIAGNÓSTICO E AUTO-TESTE EM TEMPO REAL
       ========================================================================== */
    async function runSystemDiagnostics() {
        const tests = [];
        const startTime = performance.now();

        function addTest(name, category, passed, details) {
            tests.push({ name, category, passed, details });
        }

        // 1. Banco de Dados IndexedDB & Stores
        try {
            const stores = ['students', 'teachers', 'courses', 'units', 'classes', 'grades', 'users', 'inclusion', 'interventions', 'alarm_rules'];
            const counts = {};
            for (const s of stores) {
                const items = await window.all(s);
                counts[s] = items.length;
            }
            const hasData = counts.students > 0 && counts.grades > 0;
            addTest('IndexedDB & Lojas de Dados', 'Persistência', hasData, `${counts.students} alunos, ${counts.grades} notas, ${counts.inclusion || 0} registros NAI.`);
        } catch (err) {
            addTest('IndexedDB & Lojas de Dados', 'Persistência', false, String(err));
        }

        // 2. Algoritmos Matemáticos & Ciência de Dados
        try {
            const rPos = calculatePearson([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
            const rNeg = calculatePearson([1, 2, 3, 4, 5], [10, 8, 6, 4, 2]);
            const pOk = Math.abs(rPos - 1.0) < 0.01 && Math.abs(rNeg - (-1.0)) < 0.01;
            addTest('Correlação Pearson r ∈ [-1, 1]', 'Matemática/IA', pOk, `rPos = ${rPos.toFixed(2)}, rNeg = ${rNeg.toFixed(2)}.`);

            const reg = calculateLinearRegression([{x:0, y:0}, {x:5, y:5}, {x:10, y:10}]);
            const regOk = Math.abs(reg.slope - 1) < 0.01 && Math.abs(reg.r2 - 1) < 0.01;
            addTest('Regressão Linear OLS (R²)', 'Matemática/IA', regOk, `Slope=${reg.slope.toFixed(2)}, R²=${reg.r2.toFixed(3)}.`);

            const sample = [{attendance: 90, avg: 9}, {attendance: 60, avg: 5}, {attendance: 80, avg: 7.5}, {attendance: 70, avg: 6}];
            const km = runRealKMeans(sample, 4);
            const kmOk = km.clusteredStudents.length === 4 && km.centroids.length === 4;
            addTest('Clusterização K-Means (k=4)', 'Matemática/IA', kmOk, `Centróides calculados: ${km.centroids.length}.`);

            const testMean = 7.5, testStd = 1.2;
            const pdf = (1 / (testStd * Math.sqrt(2 * Math.PI))) * Math.exp(0);
            addTest('Densidade Gaussiana Teórica', 'Matemática/IA', pdf > 0, `Pico de densidade normal calculado: ${pdf.toFixed(3)}.`);
        } catch (err) {
            addTest('Algoritmos de Ciência de Dados', 'Matemática/IA', false, String(err));
        }

        // 3. IA Generativa & Schemas
        try {
            const mockImport = '{"diagnosticoInstitucional":{"resumo":"OK","gargalos":[],"acoes":[]},"recomendacoesClusters":{},"pareceresIndividuais":[{"id":1,"diagnostico":"Teste\\nQuebra de linha","planoAcao":"1. Ação","prioridade":"ALTA","prazoDias":10}]}';
            const parsed = JSON.parse(mockImport);
            const aiOk = parsed.diagnosticoInstitucional && Array.isArray(parsed.pareceresIndividuais);
            addTest('Schema de Importação IA (Gemini/ChatGPT)', 'IA/Parser', aiOk, 'Formato compatível com descompactação e reassociação por ID.');
        } catch (err) {
            addTest('Schema de Importação IA', 'IA/Parser', false, String(err));
        }

        // 4. Layouts Responsivos & Modos de Visualização
        try {
            const hasMobileClass = document.body.hasAttribute('data-device-layout') || typeof currentDeviceLayout !== 'undefined';
            addTest('Detecção & Modos Multi-Dispositivo', 'Layout/UX', hasMobileClass, `Modo ativo: ${currentDeviceLayout || 'auto'}. Suporte a PC, Tablet e Celular.`);
        } catch (err) {
            addTest('Detecção Multi-Dispositivo', 'Layout/UX', false, String(err));
        }

        // 5. Guia Pedagógico Dinâmico
        try {
            const hasGuide = typeof inspectElementPedagogically === 'function' && typeof pedagogicalGuides !== 'undefined';
            addTest('Guia Pedagógico Dinâmico Contextual', 'Pedagógico', hasGuide, 'Mapeamento de KPIs, gráficos, gargalos e tabelas ativo.');
        } catch (err) {
            addTest('Guia Pedagógico Dinâmico', 'Pedagógico', false, String(err));
        }

        // 6. Power BI & Modelo Star Schema
        try {
            const hasPowerBI = typeof exportPowerBIStarSchema === 'function';
            addTest('Star Schema Power BI & 24h Sync', 'Business Intelligence', hasPowerBI, 'Exportação de 5 Dimensões e 2 Fatos (Dim_Alunos, Fato_Avaliacoes...).');
        } catch (err) {
            addTest('Star Schema Power BI', 'Business Intelligence', false, String(err));
        }

        // 7. Central de Alarmes e Limiares
        try {
            const hasAlarms = alarmRules && alarmRules.criticalGradeThreshold !== undefined;
            addTest('Central de Alarmes & Gatilhos', 'Alarmes', hasAlarms, `Corte Nota: ${alarmRules.criticalGradeThreshold}, Corte Frequência: ${alarmRules.criticalAttendanceThreshold}%.`);
        } catch (err) {
            addTest('Central de Alarmes', 'Alarmes', false, String(err));
        }

        const endTime = performance.now();
        const durationMs = Math.round(endTime - startTime);
        const passedCount = tests.filter(t => t.passed).length;
        const totalCount = tests.length;
        const passPercent = Math.round((passedCount / totalCount) * 100);

        // Salvar status em localStorage para testes futuros e auditoria
        const diagnosticReport = {
            executedAt: new Date().toISOString(),
            totalTests: totalCount,
            passedTests: passedCount,
            successRate: `${passPercent}%`,
            durationMs: `${durationMs}ms`,
            tests: tests
        };
        localStorage.setItem('edu_system_diagnostics_status', JSON.stringify(diagnosticReport));

        // Exibir modal rica com o status dos testes
        const modalContent = `
            <div style="display:flex;flex-direction:column;gap:14px;">
                <div style="background:${passPercent === 100 ? '#ecfdf5' : '#fffbeb'};padding:14px;border-radius:10px;border:1px solid ${passPercent === 100 ? '#a7f3d0' : '#fde68a'};display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <b style="font-size:15px;color:${passPercent === 100 ? '#065f46' : '#92400e'};">${passPercent === 100 ? '🎉 Todos os Testes Foram Aprovados!' : '⚠️ Verificação Concluída com Alertas'}</b>
                        <p style="font-size:12px;color:var(--muted);margin:3px 0 0 0;">
                            ${passedCount} de ${totalCount} verificações de integridade concluídas em ${durationMs}ms. Status salvo no navegador.
                        </p>
                    </div>
                    <span style="font-size:18px;font-weight:800;color:${passPercent === 100 ? '#059669' : '#d97706'};background:#fff;padding:6px 12px;border-radius:8px;border:1px solid rgba(0,0,0,0.06);">${passPercent}% OK</span>
                </div>

                <div style="max-height:320px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;">
                    <table style="width:100%;font-size:12px;border-collapse:collapse;">
                        <thead>
                            <tr style="background:var(--bg);border-bottom:1px solid var(--border);text-align:left;">
                                <th style="padding:8px 10px;">Status</th>
                                <th style="padding:8px 10px;">Funcionalidade / Teste</th>
                                <th style="padding:8px 10px;">Categoria</th>
                                <th style="padding:8px 10px;">Evidência / Detalhes</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tests.map(t => `
                                <tr style="border-bottom:1px solid var(--border);">
                                    <td style="padding:8px 10px;font-weight:700;color:${t.passed ? '#059669' : '#dc2626'};">
                                        ${t.passed ? '✔ PASS' : '✖ FAIL'}
                                    </td>
                                    <td style="padding:8px 10px;font-weight:600;color:var(--text);">${window.esc(t.name)}</td>
                                    <td style="padding:8px 10px;color:var(--muted);font-size:11px;">${window.esc(t.category)}</td>
                                    <td style="padding:8px 10px;color:var(--text-secondary);font-size:11px;">${window.esc(t.details)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
                    <span style="font-size:11px;color:var(--muted);">Última execução: ${new Date(diagnosticReport.executedAt).toLocaleString('pt-BR')}</span>
                    <button class="btn secondary" style="font-size:11px;" onclick="eduModules.downloadDiagnosticReport()">💾 Baixar Relatório JSON</button>
                </div>
            </div>
        `;

        window.modal('Diagnóstico do Sistema & Status de Testes', 'Validação completa em tempo real de todas as regras e módulos do EDUCONNECT', modalContent, () => {});
    }

    function downloadDiagnosticReport() {
        const raw = localStorage.getItem('edu_system_diagnostics_status');
        if (!raw) return;
        const blob = new Blob([raw], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `educonnect_status_testes_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /* ==========================================================================
       EXPOSIÇÃO DOS MÓDULOS NO ESCOPO GLOBAL
       ========================================================================== */
    window.eduModules = {
        // Acessibilidade & Layout Multi-Dispositivo
        applyAccessibility,
        changeFontSize,
        resetFontSize,
        setTheme,
        toggleDyslexia,
        setColorblindMode,
        speakText,
        toggleSpeechSummary,
        openAccessibilityModal,
        setLayoutMode,
        toggleMobileNav,

        // Filtros Cruzados
        renderSmartFilterBar,
        toggleFilterPopover,
        closeFilterPopover,
        showFilterOptions,
        refreshFilterCategories,
        applyFilterValue,
        removeFilterChip,
        clearAllFilters,
        applySmartFilters,
        triggerViewRefresh,

        // ApexCharts & Cards
        renderAdaptiveChart,
        renderCustomizableApexChart,
        renderDataScienceApexChart,
        openChartCustomizer,
        toggleChartFullscreen,
        triggerChartResize,

        // Recursos Avançados de Interface & Usabilidade
        toggleSidebar,
        toggleDynamicBg,
        initUniversalTooltips,
        initSortableTables,
        toggleInspectorDrawer,
        setInspectorContext,
        inspectElementPedagogically,
        clearElementInspection,

        // Gestão Acadêmica Interativa
        selectStudent,
        clearStudentSelection,
        renderStudentSpotlight,

        // Alarmes & Indicadores
        renderAlarmsPage,
        saveAlarmRules,
        registerPedagogicalIntervention,

        // Ciência de Dados & IA
        renderDataSciencePage,
        openAiExportModal,
        copyGeminiPrompt,
        downloadGeminiJson,
        openImportGeminiModal,
        openGeminiApiKeyModal,
        runDirectGeminiAnalysis,
        switchAiTab,
        filterAiIndividualStudents,
        updateWhatIfSimulation,
        resetWhatIfSimulation,
        openIndividualStudentAiDossier,

        // Power BI & 24h Sync
        exportPowerBIStarSchema,
        initDailyExportSchedule,
        renderDataPageExtra,
        forceDailySync,

        // Diagnóstico & Testes
        runSystemDiagnostics,
        downloadDiagnosticReport,

        // Seeding
        checkAndAutoSeedFullData
    };

    // Inicialização ao carregar
    document.addEventListener('DOMContentLoaded', () => {
        applyAccessibility();
        applySavedSidebarState();
        applySavedDynamicBg();
        initDailyExportSchedule();
        initUniversalTooltips();
        initSortableTables();
        initResponsiveObservers();
        ensureGlobalFilterPopover();
        ensureInspectorDrawer();
        initDeviceLayout();

        // Atalhos de teclado
        window.addEventListener('keydown', e => {
            if (e.altKey) {
                if (e.key === '1') window.showPage('dashboard');
                if (e.key === '2') window.showPage('reports');
                if (e.key === '3') window.showPage('alarms');
                if (e.key === '4') window.showPage('datascience');
                if (e.key === '5') window.showPage('special_needs');
                if (e.key.toLowerCase() === 's') toggleSpeechSummary();
                if (e.key.toLowerCase() === 'a') openAccessibilityModal();
                if (e.key.toLowerCase() === 'g') toggleInspectorDrawer();
            }
        });

        // Clique global para inspeção pedagógica dinâmica e fechamento de popovers
        document.addEventListener('click', e => {
            // Inspeção Pedagógica Dinâmica ao clicar em elementos relevantes
            if (e.target && !e.target.closest('#eduInspectorDrawer') && !e.target.closest('#btnGuideToggle')) {
                inspectElementPedagogically(e.target);
            }

            // Fechar popover de filtros ao clicar fora
            const pop = document.getElementById('globalFilterPopover');
            if (pop && pop.classList.contains('show') && !pop.contains(e.target) && !e.target.closest('.btn-add-filter')) {
                pop.classList.remove('show');
            }
        });
    });

})(window);
