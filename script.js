        const KEY = 'stockslight.items.ultimate';
        let items = load();
        migrateOrder();
        let currentPage = 1;
        let chartInstances = {};
        const moneyFmt = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'UZS', maximumFractionDigits: 0 });
        const now = new Date();

        const grid = document.getElementById('grid');
        const cards = document.getElementById('cards');
        const search = document.getElementById('search');
        const catSel = document.getElementById('categoryFilter');
        const sortSel = document.getElementById('sort');
        const pageSizeSel = document.getElementById('pageSize');
        const shownCount = document.getElementById('shownCount');
        const totalCount = document.getElementById('totalCount');
        const statQty = document.getElementById('statQty');
        const statSum = document.getElementById('statSum');
        const pageInfo = document.getElementById('pageInfo');
        const filterSelects = document.getElementById('filterSelects');
        const toggleFiltersBtn = document.getElementById('toggleFilters');
        const hideIcon = document.getElementById('hideIcon');
        const showIcon = document.getElementById('showIcon');

        const mEdit = document.getElementById('modalEdit');
        const mDelete = document.getElementById('modalDelete');
        const mPlus = document.getElementById('modalPlus');
        const mAnalytics = document.getElementById('analyticsModal');

        const fName = document.getElementById('fName');
        const fCategory = document.getElementById('fCategory');
        const fQty = document.getElementById('fQty');
        const fPrice = document.getElementById('fPrice');
        const fSum = document.getElementById('fSum');
        const fAdd = document.getElementById('fAdd');
        const catList = document.getElementById('catList');

        let editId = null, deleteId = null, plusId = null;

        document.getElementById('btnAdd').addEventListener('click', (e) => { e.preventDefault(); openEdit(); });
        document.getElementById('btnSave').addEventListener('click', (e) => { e.preventDefault(); onSaveEdit(); });
        document.getElementById('btnDeleteYes').addEventListener('click', (e) => { e.preventDefault(); onDeleteYes(); });
        document.getElementById('btnExport').addEventListener('click', (e) => { e.preventDefault(); exportXLS(); });
        document.getElementById('btnImport').addEventListener('click', (e) => { e.preventDefault(); checkXLSX(() => document.getElementById('fileImport').click()); });
        document.getElementById('fileImport').addEventListener('change', (e) => onXLSXReplace(e));
        document.getElementById('btnAnalytics').addEventListener('click', (e) => { e.preventDefault(); checkChart(() => { updateAnalytics(); openModal(mAnalytics); }); });
        document.getElementById('closeAnalytics').addEventListener('click', (e) => { e.preventDefault(); closeModal(mAnalytics); Object.values(chartInstances).forEach(c => c.destroy()); chartInstances = {}; });
        document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', e => { e.preventDefault(); closeModal(e.target.closest('.modal')); }));
        [mEdit, mDelete, mPlus, mAnalytics].forEach(mod => mod.addEventListener('click', e => { if (e.target === mod) closeModal(mod); }));
        document.addEventListener('keydown', e => { if (e.key === 'Escape') [mEdit, mDelete, mPlus, mAnalytics].forEach(closeModal); });

        // Event listeners for filtering, sorting and pagination
        search.addEventListener('input', () => { currentPage = 1; render(); });
        catSel.addEventListener('change', () => { currentPage = 1; render(); });
        sortSel.addEventListener('change', () => { currentPage = 1; render(); });
        pageSizeSel.addEventListener('change', () => { currentPage = 1; render(); });
        document.getElementById('prevPage').addEventListener('click', () => { if (currentPage > 1) { currentPage--; render(); } });
        document.getElementById('nextPage').addEventListener('click', () => {
            const maxPage = Math.ceil(filteredItems().length / parseInt(pageSizeSel.value));
            if (currentPage < maxPage) { currentPage++; render(); }
        });
        toggleFiltersBtn.addEventListener('click', () => {
            filterSelects.classList.toggle('hidden');
            hideIcon.style.display = filterSelects.classList.contains('hidden') ? 'none' : 'block';
            showIcon.style.display = filterSelects.classList.contains('hidden') ? 'block' : 'none';
        });

        // Event listeners for modal forms
        fQty.addEventListener('input', () => { updateSum(); });
        fPrice.addEventListener('input', () => { updateSum(); });
        document.getElementById('btnPlus').addEventListener('click', (e) => { e.preventDefault(); onPlus(); });

        render();

        // ----------------------- Functions -----------------------

        function generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
        }

        function save() {
            localStorage.setItem(KEY, JSON.stringify(items));
        }

        function load() {
            try {
                const data = localStorage.getItem(KEY);
                return data ? JSON.parse(data) : [];
            } catch {
                return [];
            }
        }

        function openModal(modal) {
            modal.style.display = 'flex';
            modal.querySelector('input, select, button').focus();
            document.body.style.overflow = 'hidden';
        }

        function closeModal(modal) {
            if (modal) modal.style.display = 'none';
            document.body.style.overflow = '';
        }

        function openEdit(id = null) {
            editId = id;
            if (id) {
                const item = items.find(i => i.id === id);
                if (item) {
                    fName.value = item.name;
                    fCategory.value = item.category;
                    fQty.value = item.qty;
                    fPrice.value = item.price;
                    fSum.value = item.sum;
                }
            } else {
                fName.value = '';
                fCategory.value = '';
                fQty.value = 0;
                fPrice.value = 0;
                fSum.value = 0;
            }
            updateSum();
            openModal(mEdit);
        }

        function onSaveEdit() {
            const name = fName.value.trim();
            const category = fCategory.value.trim();
            const qty = parseFloat(fQty.value) || 0;
            const price = parseFloat(fPrice.value) || 0;
            const sum = qty * price;

            if (!name || isNaN(qty) || isNaN(price)) {
                alert('Пожалуйста, заполните все поля.');
                return;
            }

            if (editId) {
                const item = items.find(i => i.id === editId);
                if (item) {
                    item.name = name;
                    item.category = category;
                    item.qty = qty;
                    item.price = price;
                    item.sum = sum;
                }
            } else {
                items.unshift({ id: generateId(), name, category, qty, price, sum });
            }

            save();
            closeModal(mEdit);
            render();
        }

        function openDelete(id) {
            deleteId = id;
            openModal(mDelete);
        }

        function onDeleteYes() {
            items = items.filter(i => i.id !== deleteId);
            save();
            closeModal(mDelete);
            render();
        }

        function openPlus(id) {
            plusId = id;
            fAdd.value = '';
            openModal(mPlus);
        }

        function onPlus() {
            const addValue = parseFloat(fAdd.value) || 0;
            if (isNaN(addValue)) {
                alert('Пожалуйста, введите число.');
                return;
            }

            const item = items.find(i => i.id === plusId);
            if (item) {
                item.qty = (parseFloat(item.qty) || 0) + addValue;
                item.sum = item.qty * (parseFloat(item.price) || 0);
                save();
                render();
            }
            closeModal(mPlus);
        }

        function updateSum() {
            const qty = parseFloat(fQty.value) || 0;
            const price = parseFloat(fPrice.value) || 0;
            fSum.value = (qty * price).toFixed(2);
        }

        function filteredItems() {
            const query = search.value.toLowerCase().trim();
            const category = catSel.value.toLowerCase();
            let filtered = items;

            if (query) {
                filtered = filtered.filter(item => item.name.toLowerCase().includes(query));
            }
            if (category) {
                filtered = filtered.filter(item => item.category.toLowerCase() === category);
            }
            
            return filtered;
        }

        function sortedItems(filtered) {
            const sort = sortSel.value;
            return filtered.sort((a, b) => {
                const aName = a.name.toLowerCase();
                const bName = b.name.toLowerCase();
                const aQty = parseFloat(a.qty) || 0;
                const bQty = parseFloat(b.qty) || 0;
                const aPrice = parseFloat(a.price) || 0;
                const bPrice = parseFloat(b.price) || 0;
                const aSum = parseFloat(a.sum) || 0;
                const bSum = parseFloat(b.sum) || 0;

                switch (sort) {
                    case 'name-asc': return aName > bName ? 1 : -1;
                    case 'name-desc': return aName < bName ? 1 : -1;
                    case 'qty-asc': return aQty - bQty;
                    case 'qty-desc': return bQty - aQty;
                    case 'price-asc': return aPrice - bPrice;
                    case 'price-desc': return bPrice - aPrice;
                    case 'sum-asc': return aSum - bSum;
                    case 'sum-desc': return bSum - aSum;
                    default: return 0;
                }
            });
        }

        function render() {
            const filtered = filteredItems();
            const sorted = sortedItems(filtered);
            const pageSize = parseInt(pageSizeSel.value);
            const start = pageSize === -1 ? 0 : (currentPage - 1) * pageSize;
            const end = pageSize === -1 ? sorted.length : start + pageSize;
            const paginated = sorted.slice(start, end);

            grid.innerHTML = '';
            cards.innerHTML = '';

            paginated.forEach((item, index) => {
                const globalIndex = sorted.indexOf(item);
                grid.innerHTML += createRow(item, globalIndex + 1);
                cards.innerHTML += createCard(item, globalIndex + 1);
            });

            updateStats(filtered);
            updatePagination(filtered.length);
            updateCategories();
            addListenersToRows();
        }

        function createRow(item, index) {
            return `
                <tr>
                    <td>${index}</td>
                    <td>${item.name}</td>
                    <td>${item.category}</td>
                    <td class="num right">${moneyFmt.format(item.price)}</td>
                    <td class="num right item-sum" data-id="${item.id}">${moneyFmt.format(item.sum)}</td>
                    <td class="right">
                        <input type="number" value="${item.qty}" class="qty-input" data-id="${item.id}" inputmode="numeric">
                    </td>
                    <td class="right">
                        <div class="row-actions">
                            <button class="icon-btn" onclick="openPlus('${item.id}')" title="Пополнить">
                                <svg viewBox="0 0 24 24"><path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6Z"/></svg>
                            </button>
                            <button class="icon-btn" onclick="openEdit('${item.id}')" title="Редактировать">
                                <svg viewBox="0 0 24 24"><path d="M20.71 7.04c.39-.39.39-1.03 0-1.42l-2.34-2.34c-.39-.39-1.03-.39-1.42 0L14.5 4.5 19.5 9.5l1.21-1.21c.39-.39.39-1.02 0-1.41zM10 16H8v-2l5.5-5.5 2 2L10 16zm-5-3.5L12 20h2v-2l-7-7.5V12.5z"/></svg>
                            </button>
                            <button class="icon-btn danger" onclick="openDelete('${item.id}')" title="Удалить">
                                <svg viewBox="0 0 24 24"><path d="M6 7h12l-1 14H7L6 7Zm3-3h6l1 2H8l1-2Z"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }

        function createCard(item, index) {
            return `
                <div class="card" data-id="${item.id}">
                    <div class="card-title-row">
                        <div class="card-title">${item.name} <span class="badge">${index}</span></div>
                        <span class="chip-badge">${item.category}</span>
                    </div>
                    <div class="card-grid">
                        <div class="metric">
                            <div class="label">Цена</div>
                            <div class="value num">${moneyFmt.format(item.price)}</div>
                        </div>
                        <div class="metric">
                            <div class="label">Сумма</div>
                            <div class="value num item-sum">${moneyFmt.format(item.sum)}</div>
                        </div>
                    </div>
                    <div class="card-bottom-row">
                        <div class="metric">
                            <div class="label">Количество</div>
                            <input type="number" value="${item.qty}" class="qty-input" inputmode="numeric">
                        </div>
                        <div class="card-actions-row">
                            <button class="card-icon-btn" onclick="openPlus('${item.id}')" title="Пополнить">
                                <svg viewBox="0 0 24 24"><path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6Z"/></svg>
                            </button>
                            <button class="card-icon-btn" onclick="openEdit('${item.id}')" title="Редактировать">
                                <svg viewBox="0 0 24 24"><path d="M20.71 7.04c.39-.39.39-1.03 0-1.42l-2.34-2.34c-.39-.39-1.03-.39-1.42 0L14.5 4.5 19.5 9.5l1.21-1.21c.39-.39.39-1.02 0-1.41zM10 16H8v-2l5.5-5.5 2 2L10 16zm-5-3.5L12 20h2v-2l-7-7.5V12.5z"/></svg>
                            </button>
                            <button class="card-icon-btn danger" onclick="openDelete('${item.id}')" title="Удалить">
                                <svg viewBox="0 0 24 24"><path d="M6 7h12l-1 14H7L6 7Zm3-3h6l1 2H8l1-2Z"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        function addListenersToRows() {
            const qtyInputs = document.querySelectorAll('.qty-input');
            qtyInputs.forEach(input => {
                input.addEventListener('input', (e) => {
                    const itemId = e.target.dataset.id || e.target.closest('.card').dataset.id;
                    const item = items.find(i => i.id === itemId);
                    
                    if (item) {
                        const newQty = parseFloat(e.target.value) || 0;
                        item.qty = newQty;
                        item.sum = newQty * item.price;
                        save();
                        updateStats(filteredItems());
                        
                        const cardSum = document.querySelector(`.card[data-id="${itemId}"] .item-sum`);
                        if (cardSum) cardSum.textContent = moneyFmt.format(item.sum);
                        
                        const rowSum = document.querySelector(`td.item-sum[data-id="${itemId}"]`);
                        if (rowSum) rowSum.textContent = moneyFmt.format(item.sum);
                    }
                });
            });
        }

        function updateStats(data) {
            const totalQty = data.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
            const totalSum = data.reduce((sum, item) => sum + (parseFloat(item.sum) || 0), 0);
            
            statQty.textContent = totalQty.toLocaleString('ru-RU');
            statSum.textContent = moneyFmt.format(totalSum);
            shownCount.textContent = data.length;
            totalCount.textContent = items.length;
        }

        function updatePagination(totalItems) {
            const pageSize = parseInt(pageSizeSel.value);
            const maxPage = pageSize === -1 ? 1 : Math.ceil(totalItems / pageSize);
            pageInfo.textContent = `Стр. ${currentPage}/${maxPage}`;
            document.getElementById('prevPage').disabled = currentPage <= 1;
            document.getElementById('nextPage').disabled = currentPage >= maxPage;
        }

        function updateCategories() {
            const categories = [...new Set(items.map(i => i.category).filter(Boolean))].sort();
            const currentCat = catSel.value;
            catSel.innerHTML = '<option value="">Все категории</option>';
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                catSel.appendChild(option);
            });
            catSel.value = currentCat;
            catList.innerHTML = categories.map(cat => `<option value="${cat}">`).join('');
        }

        function exportXLS() {
            if (!window.xlsxLoaded) {
                alert('Библиотека XLSX еще не загрузилась. Пожалуйста, подождите или обновите страницу.');
                return;
            }

            const data = items.map(item => ({
                'Наименование товара': item.name,
                'Категория': item.category,
                'Количество': item.qty,
                'Цена (UZS)': item.price,
                'Сумма (UZS)': item.sum
            }));
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Товары');
            XLSX.writeFile(workbook, `stockslight-export-${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}.xlsx`);
        }

        function checkXLSX(callback) {
            if (window.xlsxLoaded) {
                callback();
            } else {
                alert('Библиотека XLSX еще не загрузилась. Пожалуйста, подождите или обновите страницу.');
            }
        }

        function onXLSXReplace(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                items = json.map(row => ({
                    id: generateId(),
                    name: row['Наименование товара'] || '',
                    category: row['Категория'] || '',
                    qty: row['Количество'] || 0,
                    price: row['Цена (UZS)'] || 0,
                    sum: (row['Количество'] || 0) * (row['Цена (UZS)'] || 0)
                }));

                save();
                render();
                alert('Данные успешно импортированы!');
            };
            reader.readAsArrayBuffer(file);
        }

        function checkChart(callback) {
            if (window.chartLoaded) {
                callback();
            } else {
                alert('Библиотека Chart.js еще не загрузилась. Пожалуйста, подождите или обновите страницу.');
            }
        }

        function updateAnalytics() {
            const sortedBySum = [...items].sort((a, b) => b.sum - a.sum).slice(0, 10);
            const labels = sortedBySum.map(item => item.name);
            const data = sortedBySum.map(item => item.sum);

            const tableBody = document.getElementById('topItems');
            tableBody.innerHTML = sortedBySum.map(item => `<tr><td>${item.name}</td><td>${moneyFmt.format(item.sum)}</td></tr>`).join('');

            // Bar Chart
            const barCtx = document.getElementById('barChart');
            if (chartInstances.bar) chartInstances.bar.destroy();
            chartInstances.bar = new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Сумма (UZS)',
                        data: data,
                        backgroundColor: 'var(--accent)',
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        x: { ticks: { color: 'var(--ink2)' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                        y: { ticks: { color: 'var(--ink2)' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
                    }
                }
            });

            // Pie Chart
            const pieCtx = document.getElementById('pieChart');
            if (chartInstances.pie) chartInstances.pie.destroy();
            chartInstances.pie = new Chart(pieCtx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: ['#3b82f6', '#22c55e', '#ef4444', '#f97316', '#a855f7', '#ec4899', '#facc15', '#6366f1', '#14b8a6', '#f43f5e']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: 'var(--ink2)' } }
                    }
                }
            });
        }
        
        // --- Migration functions
        function migrateOrder() {
            const v1Key = 'stockslight.items';
            const v1Items = localStorage.getItem(v1Key);
            if (v1Items && !localStorage.getItem(KEY)) {
                try {
                    const parsed = JSON.parse(v1Items);
                    if (Array.isArray(parsed) && parsed.length > 0 && !parsed[0].id) {
                        items = parsed.map((item, index) => ({
                            id: generateId(),
                            name: item.name,
                            category: item.category,
                            qty: item.qty,
                            price: item.price,
                            sum: item.sum
                        }));
                        save();
                        localStorage.removeItem(v1Key);
                    }
                } catch (e) { console.error('Failed to migrate old data:', e); }
            }
        }

