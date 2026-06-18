const Storage = {
    KEYS: {
        ROOMS: 'chess_rooms',
        TIME_SLOTS: 'chess_time_slots',
        ADDONS: 'chess_addons',
        ORDERS: 'chess_orders',
        BILLS: 'chess_bills',
        WAITING: 'chess_waiting',
        CONFIG: 'chess_config'
    },

    get(key, defaultValue) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    },

    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },

    init() {
        if (!this.get(this.KEYS.TIME_SLOTS)) {
            this.set(this.KEYS.TIME_SLOTS, [
                { id: 'ts1', name: '凌晨低谷', startTime: '00:00', endTime: '08:00', type: 'valley', price: 20 },
                { id: 'ts2', name: '上午平峰', startTime: '08:00', endTime: '12:00', type: 'normal', price: 30 },
                { id: 'ts3', name: '午间高峰', startTime: '12:00', endTime: '14:00', type: 'peak', price: 50 },
                { id: 'ts4', name: '下午平峰', startTime: '14:00', endTime: '18:00', type: 'normal', price: 35 },
                { id: 'ts5', name: '晚间高峰', startTime: '18:00', endTime: '23:00', type: 'peak', price: 60 },
                { id: 'ts6', name: '深夜低谷', startTime: '23:00', endTime: '24:00', type: 'valley', price: 25 }
            ]);
        }
        if (!this.get(this.KEYS.ROOMS)) {
            this.set(this.KEYS.ROOMS, [
                { id: 'r1', code: 'A101', name: '豪华大包', capacity: 10, amenities: '空调、沙发、茶台', status: 'available' },
                { id: 'r2', code: 'A102', name: '商务中包', capacity: 6, amenities: '空调、茶台', status: 'available' },
                { id: 'r3', code: 'A103', name: '舒适小包', capacity: 4, amenities: '空调', status: 'available' },
                { id: 'r4', code: 'B201', name: 'VIP包间', capacity: 12, amenities: '空调、沙发、茶台、独立卫生间', status: 'available' },
                { id: 'r5', code: 'B202', name: '标准包间', capacity: 4, amenities: '空调', status: 'available' },
                { id: 'r6', code: 'B203', name: '家庭包间', capacity: 8, amenities: '空调、沙发', status: 'available' }
            ]);
        }
        if (!this.get(this.KEYS.ADDONS)) {
            this.set(this.KEYS.ADDONS, [
                { id: 'a1', name: '铁观音', category: '茶水', price: 38 },
                { id: 'a2', name: '普洱茶', category: '茶水', price: 48 },
                { id: 'a3', name: '碧螺春', category: '茶水', price: 58 },
                { id: 'a4', name: '菊花茶', category: '茶水', price: 28 },
                { id: 'a5', name: '矿泉水', category: '饮品', price: 5 },
                { id: 'a6', name: '可乐', category: '饮品', price: 8 },
                { id: 'a7', name: '瓜子', category: '零食', price: 15 },
                { id: 'a8', name: '水果拼盘', category: '零食', price: 68 }
            ]);
        }
        if (!this.get(this.KEYS.ORDERS)) {
            this.set(this.KEYS.ORDERS, []);
        }
        if (!this.get(this.KEYS.BILLS)) {
            this.set(this.KEYS.BILLS, []);
        }
        if (!this.get(this.KEYS.WAITING)) {
            this.set(this.KEYS.WAITING, []);
        }
        if (!this.get(this.KEYS.CONFIG)) {
            this.set(this.KEYS.CONFIG, { releaseMinutes: 15 });
        }
    }
};

const Pricing = {
    getTimeSlots() {
        return Storage.get(Storage.KEYS.TIME_SLOTS, []);
    },

    saveTimeSlot(slot) {
        const slots = this.getTimeSlots();
        if (slot.id) {
            const idx = slots.findIndex(s => s.id === slot.id);
            if (idx >= 0) slots[idx] = slot;
        } else {
            slot.id = 'ts' + Date.now();
            slots.push(slot);
        }
        Storage.set(Storage.KEYS.TIME_SLOTS, slots);
    },

    deleteTimeSlot(id) {
        const slots = this.getTimeSlots().filter(s => s.id !== id);
        Storage.set(Storage.KEYS.TIME_SLOTS, slots);
    },

    getAddons() {
        return Storage.get(Storage.KEYS.ADDONS, []);
    },

    saveAddon(addon) {
        const addons = this.getAddons();
        if (addon.id) {
            const idx = addons.findIndex(a => a.id === addon.id);
            if (idx >= 0) addons[idx] = addon;
        } else {
            addon.id = 'a' + Date.now();
            addons.push(addon);
        }
        Storage.set(Storage.KEYS.ADDONS, addons);
    },

    deleteAddon(id) {
        const addons = this.getAddons().filter(a => a.id !== id);
        Storage.set(Storage.KEYS.ADDONS, addons);
    },

    getConfig() {
        return Storage.get(Storage.KEYS.CONFIG, { releaseMinutes: 15 });
    },

    saveConfig(config) {
        Storage.set(Storage.KEYS.CONFIG, config);
    },

    timeToMinutes(timeStr) {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    },

    getSlotForTime(minutesOfDay) {
        const slots = this.getTimeSlots();
        for (const slot of slots) {
            const start = this.timeToMinutes(slot.startTime);
            let end = this.timeToMinutes(slot.endTime);
            if (end === 0) end = 1440;
            if (minutesOfDay >= start && minutesOfDay < end) {
                return slot;
            }
        }
        return null;
    },

    calculateBillableSegments(startTime, endTime) {
        const segments = [];
        const start = new Date(startTime).getTime();
        const end = new Date(endTime).getTime();

        if (end <= start) return segments;

        let current = start;
        while (current < end) {
            const currentDate = new Date(current);
            const minutesOfDay = currentDate.getHours() * 60 + currentDate.getMinutes();
            const slot = this.getSlotForTime(minutesOfDay);

            if (!slot) {
                current += 60000;
                continue;
            }

            const slotStartMin = this.timeToMinutes(slot.startTime);
            let slotEndMin = this.timeToMinutes(slot.endTime);
            if (slotEndMin === 0) slotEndMin = 1440;

            const segmentStartDate = new Date(current);
            segmentStartDate.setHours(0, 0, 0, 0);
            const segmentEnd = Math.min(
                end,
                segmentStartDate.getTime() + slotEndMin * 60000
            );

            const durationMinutes = Math.max(1, Math.round((segmentEnd - current) / 60000));
            const durationHours = durationMinutes / 60;
            const cost = parseFloat((durationHours * slot.price).toFixed(2));

            segments.push({
                slotName: slot.name,
                slotType: slot.type,
                pricePerHour: slot.price,
                startTime: new Date(current).toLocaleString('zh-CN'),
                endTime: new Date(segmentEnd).toLocaleString('zh-CN'),
                durationMinutes,
                durationHours: durationHours.toFixed(2),
                cost
            });

            current = segmentEnd;
        }

        return segments;
    },

    calculateRoomFee(startTime, endTime) {
        const segments = this.calculateBillableSegments(startTime, endTime);
        const total = segments.reduce((sum, s) => sum + s.cost, 0);
        return {
            segments,
            total: parseFloat(total.toFixed(2))
        };
    }
};

const Rooms = {
    getAll() {
        return Storage.get(Storage.KEYS.ROOMS, []);
    },

    getById(id) {
        return this.getAll().find(r => r.id === id);
    },

    save(room) {
        const rooms = this.getAll();
        if (room.id) {
            const idx = rooms.findIndex(r => r.id === room.id);
            if (idx >= 0) rooms[idx] = room;
        } else {
            room.id = 'r' + Date.now();
            room.status = 'available';
            rooms.push(room);
        }
        Storage.set(Storage.KEYS.ROOMS, rooms);
    },

    delete(id) {
        const rooms = this.getAll().filter(r => r.id !== id);
        Storage.set(Storage.KEYS.ROOMS, rooms);
    },

    updateStatus(id, status) {
        const rooms = this.getAll();
        const room = rooms.find(r => r.id === id);
        if (room) {
            room.status = status;
            Storage.set(Storage.KEYS.ROOMS, rooms);
        }
    },

    getAvailable() {
        return this.getAll().filter(r => r.status === 'available');
    }
};

const Orders = {
    getAll() {
        return Storage.get(Storage.KEYS.ORDERS, []);
    },

    getActive() {
        return this.getAll().filter(o => o.status === 'active' || o.status === 'reserved');
    },

    getByRoomId(roomId) {
        return this.getAll().find(o => (o.status === 'active' || o.status === 'reserved') && o.roomId === roomId);
    },

    save(order) {
        const orders = this.getAll();
        if (order.id) {
            const idx = orders.findIndex(o => o.id === order.id);
            if (idx >= 0) orders[idx] = order;
        } else {
            order.id = 'o' + Date.now();
            orders.push(order);
        }
        Storage.set(Storage.KEYS.ORDERS, orders);
    },

    create(data) {
        const order = {
            id: 'o' + Date.now(),
            roomId: data.roomId,
            customerName: data.customerName,
            phone: data.phone,
            peopleCount: data.peopleCount,
            startTime: data.startTime || new Date().toISOString(),
            endTime: null,
            status: data.reserveOnly ? 'reserved' : 'active',
            reservedAt: data.reserveOnly ? new Date().toISOString() : null,
            addons: [],
            createdAt: new Date().toISOString()
        };
        this.save(order);
        if (!data.reserveOnly) {
            Rooms.updateStatus(data.roomId, 'occupied');
        } else {
            Rooms.updateStatus(data.roomId, 'reserved');
        }
        return order;
    },

    addAddon(orderId, addonId, quantity) {
        const orders = this.getAll();
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const addonInfo = Pricing.getAddons().find(a => a.id === addonId);
        if (!addonInfo) return;

        const existing = order.addons.find(a => a.addonId === addonId);
        if (existing) {
            existing.quantity += quantity;
            existing.subtotal = parseFloat((existing.quantity * addonInfo.price).toFixed(2));
        } else {
            order.addons.push({
                addonId,
                name: addonInfo.name,
                category: addonInfo.category,
                price: addonInfo.price,
                quantity,
                subtotal: parseFloat((quantity * addonInfo.price).toFixed(2))
            });
        }
        Storage.set(Storage.KEYS.ORDERS, orders);
    },

    removeAddon(orderId, addonId) {
        const orders = this.getAll();
        const order = orders.find(o => o.id === orderId);
        if (!order) return;
        order.addons = order.addons.filter(a => a.addonId !== addonId);
        Storage.set(Storage.KEYS.ORDERS, orders);
    },

    checkin(reservedOrderId) {
        const orders = this.getAll();
        const order = orders.find(o => o.id === reservedOrderId);
        if (!order || order.status !== 'reserved') return;
        order.status = 'active';
        order.startTime = new Date().toISOString();
        Storage.set(Storage.KEYS.ORDERS, orders);
        Rooms.updateStatus(order.roomId, 'occupied');
        return order;
    },

    checkout(orderId) {
        const orders = this.getAll();
        const order = orders.find(o => o.id === orderId);
        if (!order) return null;

        order.endTime = new Date().toISOString();
        order.status = 'completed';

        const feeResult = Pricing.calculateRoomFee(order.startTime, order.endTime);
        const addonsTotal = order.addons.reduce((sum, a) => sum + a.subtotal, 0);

        const bill = {
            id: 'b' + Date.now(),
            orderId: order.id,
            roomId: order.roomId,
            roomName: Rooms.getById(order.roomId)?.name || '',
            customerName: order.customerName,
            phone: order.phone,
            peopleCount: order.peopleCount,
            startTime: order.startTime,
            endTime: order.endTime,
            durationMinutes: Math.round((new Date(order.endTime) - new Date(order.startTime)) / 60000),
            segments: feeResult.segments,
            roomFee: feeResult.total,
            addons: order.addons,
            addonsTotal: parseFloat(addonsTotal.toFixed(2)),
            total: parseFloat((feeResult.total + addonsTotal).toFixed(2)),
            createdAt: new Date().toISOString()
        };

        const bills = Bills.getAll();
        bills.push(bill);
        Storage.set(Storage.KEYS.BILLS, bills);

        const activeOrders = orders.filter(o => o.id !== orderId);
        Storage.set(Storage.KEYS.ORDERS, activeOrders);

        Rooms.updateStatus(order.roomId, 'available');

        Waiting.tryFillRoom(order.roomId);

        return bill;
    },

    cancel(orderId) {
        const orders = this.getAll();
        const order = orders.find(o => o.id === orderId);
        if (!order) return;
        const activeOrders = orders.filter(o => o.id !== orderId);
        Storage.set(Storage.KEYS.ORDERS, activeOrders);
        Rooms.updateStatus(order.roomId, 'available');
        Waiting.tryFillRoom(order.roomId);
    },

    checkReleaseExpired() {
        const config = Pricing.getConfig();
        const now = new Date().getTime();
        const orders = this.getAll();
        const expired = [];

        for (const order of orders) {
            if (order.status === 'reserved' && order.reservedAt) {
                const reservedTime = new Date(order.reservedAt).getTime();
                if (now - reservedTime > config.releaseMinutes * 60 * 1000) {
                    expired.push(order);
                }
            }
        }

        for (const order of expired) {
            this.cancel(order.id);
            App.toast(`预订超时：${Rooms.getById(order.roomId)?.name} 已自动释放，通知候补客人补位`, 'warning');
        }

        return expired;
    }
};

const Bills = {
    getAll() {
        return Storage.get(Storage.KEYS.BILLS, []);
    },

    getById(id) {
        return this.getAll().find(b => b.id === id);
    },

    getTodayRevenue() {
        const today = new Date().toDateString();
        return this.getAll()
            .filter(b => new Date(b.createdAt).toDateString() === today)
            .reduce((sum, b) => sum + b.total, 0);
    }
};

const Waiting = {
    getAll() {
        return Storage.get(Storage.KEYS.WAITING, []);
    },

    getActive() {
        return this.getAll().filter(w => w.status === 'waiting');
    },

    add(data) {
        const waiting = this.getAll();
        const activeCount = waiting.filter(w => w.status === 'waiting').length;
        const entry = {
            id: 'w' + Date.now(),
            queueNumber: activeCount + 1,
            customerName: data.customerName,
            phone: data.phone,
            peopleCount: data.peopleCount,
            preferredRoomId: data.preferredRoomId || null,
            createdAt: new Date().toISOString(),
            status: 'waiting',
            notified: false
        };
        waiting.push(entry);
        Storage.set(Storage.KEYS.WAITING, waiting);
        return entry;
    },

    updateStatus(id, status) {
        const waiting = this.getAll();
        const entry = waiting.find(w => w.id === id);
        if (entry) {
            entry.status = status;
            Storage.set(Storage.KEYS.WAITING, waiting);
        }
    },

    remove(id) {
        const waiting = this.getAll().filter(w => w.id !== id);
        this.requeue(waiting);
        Storage.set(Storage.KEYS.WAITING, waiting);
    },

    requeue(waitingList) {
        let idx = 1;
        for (const w of waitingList) {
            if (w.status === 'waiting') {
                w.queueNumber = idx++;
            }
        }
    },

    tryFillRoom(roomId) {
        const room = Rooms.getById(roomId);
        if (!room) return null;

        const waiting = this.getAll();
        const match = waiting.find(w =>
            w.status === 'waiting' &&
            (!w.preferredRoomId || w.preferredRoomId === roomId) &&
            w.peopleCount <= room.capacity
        );

        if (match) {
            match.status = 'notified';
            match.notifiedRoomId = roomId;
            match.notifiedAt = new Date().toISOString();
            Storage.set(Storage.KEYS.WAITING, waiting);
            App.toast(`候补通知：${match.customerName} (${match.phone}) 可入住 ${room.name}`, 'success');
            return match;
        }
        return null;
    },

    acceptWaiting(waitingId) {
        const waiting = this.getAll();
        const entry = waiting.find(w => w.id === waitingId);
        if (!entry || !entry.notifiedRoomId) return null;

        const order = Orders.create({
            roomId: entry.notifiedRoomId,
            customerName: entry.customerName,
            phone: entry.phone,
            peopleCount: entry.peopleCount,
            reserveOnly: false
        });

        entry.status = 'seated';
        Storage.set(Storage.KEYS.WAITING, waiting);

        return order;
    }
};

const UI = {
    formatDuration(minutes) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        if (h > 0) return `${h}小时${m}分钟`;
        return `${m}分钟`;
    },

    formatMoney(num) {
        return '¥' + parseFloat(num || 0).toFixed(2);
    },

    formatDateTime(iso) {
        if (!iso) return '-';
        return new Date(iso).toLocaleString('zh-CN');
    },

    getRateTypeLabel(type) {
        const map = { peak: '高峰', normal: '平峰', valley: '低谷' };
        return map[type] || type;
    },

    getRateTypeClass(type) {
        return type || 'normal';
    },

    getStatusLabel(status) {
        const map = {
            available: '空闲',
            occupied: '使用中',
            reserved: '已预订',
            active: '进行中',
            completed: '已完成',
            waiting: '等待中',
            notified: '已通知',
            seated: '已入座',
            cancelled: '已取消'
        };
        return map[status] || status;
    }
};

const App = {
    currentTab: 'dashboard',
    refreshInterval: null,
    tempAddons: {},

    init() {
        Storage.init();
        this.bindTabs();
        this.startClock();
        this.startAutoRefresh();
        this.refreshAll();
        this.renderBillDateFilter();
    },

    bindTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });
    },

    switchTab(tab) {
        this.currentTab = tab;
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tab === tab);
        });
        document.querySelectorAll('.tab-pane').forEach(p => {
            p.classList.toggle('active', p.id === tab);
        });
        this.refreshAll();
    },

    startClock() {
        const update = () => {
            const el = document.getElementById('currentTime');
            if (el) el.textContent = new Date().toLocaleString('zh-CN');
        };
        update();
        setInterval(update, 1000);
    },

    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            Orders.checkReleaseExpired();
            if (this.currentTab === 'dashboard') {
                this.refreshDashboard();
            }
        }, 10000);
    },

    refreshAll() {
        this.refreshDashboard();
        this.refreshRoomsTable();
        this.refreshTimeSlotsTable();
        this.refreshAddonsTable();
        this.refreshBillsTable();
        this.refreshWaitingTable();
        this.refreshConfig();
    },

    refreshConfig() {
        const config = Pricing.getConfig();
        const input = document.getElementById('releaseMinutes');
        if (input) input.value = config.releaseMinutes;
    },

    refreshDashboard() {
        const rooms = Rooms.getAll();
        const using = rooms.filter(r => r.status === 'occupied').length;
        const available = rooms.filter(r => r.status === 'available').length;
        const waiting = Waiting.getActive().length;
        const revenue = Bills.getTodayRevenue();

        const elUsing = document.getElementById('statUsing');
        const elAvailable = document.getElementById('statAvailable');
        const elWaiting = document.getElementById('statWaiting');
        const elRevenue = document.getElementById('statRevenue');
        if (elUsing) elUsing.textContent = using;
        if (elAvailable) elAvailable.textContent = available;
        if (elWaiting) elWaiting.textContent = waiting;
        if (elRevenue) elRevenue.textContent = revenue.toFixed(2);

        this.renderRoomsGrid();
        this.renderActiveOrdersTable();
    },

    renderRoomsGrid() {
        const grid = document.getElementById('roomsGrid');
        if (!grid) return;
        const rooms = Rooms.getAll();

        grid.innerHTML = rooms.map(room => {
            const order = Orders.getByRoomId(room.id);
            let info = '';
            if (order) {
                if (order.status === 'active') {
                    const now = new Date().getTime();
                    const start = new Date(order.startTime).getTime();
                    const mins = Math.round((now - start) / 60000);
                    const fee = Pricing.calculateRoomFee(order.startTime, new Date().toISOString()).total;
                    info = `${order.customerName} · ${UI.formatDuration(mins)} · ${UI.formatMoney(fee)}`;
                } else if (order.status === 'reserved') {
                    info = `预订：${order.customerName}`;
                }
            }
            return `
                <div class="room-card ${room.status}" onclick="App.onRoomCardClick('${room.id}')">
                    <div class="room-number">${room.code}</div>
                    <div class="room-name">${room.name}</div>
                    <span class="room-status ${room.status}">${UI.getStatusLabel(room.status)}</span>
                    <div class="room-info">${info || `容纳${room.capacity}人`}</div>
                </div>
            `;
        }).join('');
    },

    onRoomCardClick(roomId) {
        const room = Rooms.getById(roomId);
        if (!room) return;
        const order = Orders.getByRoomId(roomId);

        if (room.status === 'available') {
            this.showCheckinModal(roomId);
        } else if (order && order.status === 'active') {
            this.showOrderDetailModal(order.id);
        } else if (order && order.status === 'reserved') {
            this.showReservedModal(order.id);
        }
    },

    renderActiveOrdersTable() {
        const tbody = document.querySelector('#activeOrdersTable tbody');
        if (!tbody) return;
        const orders = Orders.getActive().filter(o => o.status === 'active');

        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">暂无进行中的订单</td></tr>';
            return;
        }

        tbody.innerHTML = orders.map(order => {
            const room = Rooms.getById(order.roomId);
            const now = new Date().getTime();
            const start = new Date(order.startTime).getTime();
            const mins = Math.round((now - start) / 60000);
            const fee = Pricing.calculateRoomFee(order.startTime, new Date().toISOString()).total;
            const addonsText = order.addons.length > 0
                ? order.addons.map(a => `${a.name}×${a.quantity}`).join('，')
                : '-';

            return `
                <tr>
                    <td><strong>${room?.code} ${room?.name}</strong></td>
                    <td>${order.customerName}</td>
                    <td>${UI.formatDateTime(order.startTime)}</td>
                    <td>${UI.formatDuration(mins)}</td>
                    <td>${UI.formatMoney(fee)}</td>
                    <td>${addonsText}</td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="App.showAddonModalForOrder('${order.id}')">加购</button>
                        <button class="btn btn-sm btn-primary" onclick="App.showCheckoutModal('${order.id}')">结账</button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    refreshRoomsTable() {
        const tbody = document.querySelector('#roomsTable tbody');
        if (!tbody) return;
        const rooms = Rooms.getAll();

        if (rooms.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">暂无包间数据</td></tr>';
            return;
        }

        tbody.innerHTML = rooms.map(room => `
            <tr>
                <td><strong>${room.code}</strong></td>
                <td>${room.name}</td>
                <td>${room.capacity}人</td>
                <td>${room.amenities || '-'}</td>
                <td><span class="room-status ${room.status}">${UI.getStatusLabel(room.status)}</span></td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="App.showRoomModal('${room.id}')">编辑</button>
                    <button class="btn btn-sm btn-danger" onclick="App.deleteRoom('${room.id}')">删除</button>
                </td>
            </tr>
        `).join('');
    },

    refreshTimeSlotsTable() {
        const tbody = document.querySelector('#timeSlotsTable tbody');
        if (!tbody) return;
        const slots = Pricing.getTimeSlots().sort((a, b) =>
            Pricing.timeToMinutes(a.startTime) - Pricing.timeToMinutes(b.startTime)
        );

        if (slots.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">暂无时段数据</td></tr>';
            return;
        }

        tbody.innerHTML = slots.map(slot => `
            <tr>
                <td>${slot.name}</td>
                <td>${slot.startTime}</td>
                <td>${slot.endTime}</td>
                <td><span class="tag ${UI.getRateTypeClass(slot.type)}">${UI.getRateTypeLabel(slot.type)}</span></td>
                <td>¥${slot.price}/小时</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="App.showTimeSlotModal('${slot.id}')">编辑</button>
                    <button class="btn btn-sm btn-danger" onclick="App.deleteTimeSlot('${slot.id}')">删除</button>
                </td>
            </tr>
        `).join('');
    },

    refreshAddonsTable() {
        const tbody = document.querySelector('#addonsTable tbody');
        if (!tbody) return;
        const addons = Pricing.getAddons();

        if (addons.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">暂无加购项目</td></tr>';
            return;
        }

        tbody.innerHTML = addons.map(addon => `
            <tr>
                <td>${addon.name}</td>
                <td>${addon.category}</td>
                <td>¥${addon.price}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="App.showAddonModal('${addon.id}')">编辑</button>
                    <button class="btn btn-sm btn-danger" onclick="App.deleteAddon('${addon.id}')">删除</button>
                </td>
            </tr>
        `).join('');
    },

    renderBillDateFilter() {
        const el = document.getElementById('billDateFilter');
        if (el) {
            el.value = new Date().toISOString().split('T')[0];
        }
    },

    refreshBillsTable() {
        const tbody = document.querySelector('#billsTable tbody');
        if (!tbody) return;
        let bills = Bills.getAll();
        const dateFilter = document.getElementById('billDateFilter')?.value;
        if (dateFilter) {
            bills = bills.filter(b => {
                const d = new Date(b.createdAt).toISOString().split('T')[0];
                return d === dateFilter;
            });
        }
        bills.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (bills.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="empty-state">暂无账单数据</td></tr>';
            return;
        }

        tbody.innerHTML = bills.map(bill => `
            <tr>
                <td><strong>${bill.id}</strong></td>
                <td>${bill.roomName}</td>
                <td>${bill.customerName}</td>
                <td>${UI.formatDateTime(bill.startTime)}</td>
                <td>${UI.formatDateTime(bill.endTime)}</td>
                <td>${UI.formatDuration(bill.durationMinutes)}</td>
                <td>${UI.formatMoney(bill.roomFee)}</td>
                <td>${UI.formatMoney(bill.addonsTotal)}</td>
                <td><strong>${UI.formatMoney(bill.total)}</strong></td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="App.showBillDetailModal('${bill.id}')">详情</button>
                </td>
            </tr>
        `).join('');
    },

    filterBills() {
        this.refreshBillsTable();
    },

    refreshWaitingTable() {
        const tbody = document.querySelector('#waitingTable tbody');
        if (!tbody) return;
        const waiting = Waiting.getAll().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        if (waiting.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state">暂无候补记录</td></tr>';
            return;
        }

        tbody.innerHTML = waiting.map(w => {
            const room = w.preferredRoomId ? Rooms.getById(w.preferredRoomId) : null;
            let actions = '';
            if (w.status === 'waiting') {
                actions = `
                    <button class="btn btn-sm btn-danger" onclick="App.removeWaiting('${w.id}')">取消</button>
                `;
            } else if (w.status === 'notified') {
                actions = `
                    <button class="btn btn-sm btn-success" onclick="App.acceptWaiting('${w.id}')">确认入座</button>
                    <button class="btn btn-sm btn-danger" onclick="App.removeWaiting('${w.id}')">放弃</button>
                `;
            }
            return `
                <tr>
                    <td><strong>#${w.queueNumber}</strong></td>
                    <td>${w.customerName}</td>
                    <td>${w.phone}</td>
                    <td>${w.peopleCount}人</td>
                    <td>${room ? room.name : '任意'}</td>
                    <td>${UI.formatDateTime(w.createdAt)}</td>
                    <td><span class="room-status ${w.status === 'waiting' ? 'reserved' : 'available'}">${UI.getStatusLabel(w.status)}</span></td>
                    <td>${actions}</td>
                </tr>
            `;
        }).join('');
    },

    openModal(html) {
        const container = document.getElementById('modalContainer');
        const content = document.getElementById('modalContent');
        content.innerHTML = html;
        container.classList.add('active');
    },

    closeModal() {
        document.getElementById('modalContainer').classList.remove('active');
    },

    toast(message, type = 'success') {
        const el = document.getElementById('toast');
        el.textContent = message;
        el.className = 'toast active ' + type;
        setTimeout(() => {
            el.className = 'toast';
        }, 3000);
    },

    showCheckinModal(preselectedRoomId) {
        const rooms = Rooms.getAvailable();
        if (rooms.length === 0) {
            this.toast('暂无可使用的包间', 'error');
            return;
        }
        const roomOptions = rooms.map(r =>
            `<option value="${r.id}" ${r.id === preselectedRoomId ? 'selected' : ''}>${r.code} ${r.name} (${r.capacity}人)</option>`
        ).join('');

        this.openModal(`
            <div class="modal-header">
                <h3>开台登记</h3>
                <button class="modal-close" onclick="App.closeModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="form-row">
                    <label>选择包间 *</label>
                    <select id="ciRoom" class="form-input">${roomOptions}</select>
                </div>
                <div class="form-row">
                    <label>客人姓名 *</label>
                    <input type="text" id="ciName" class="form-input" placeholder="请输入客人姓名">
                </div>
                <div class="form-row">
                    <label>联系电话 *</label>
                    <input type="text" id="ciPhone" class="form-input" placeholder="请输入联系电话">
                </div>
                <div class="form-row">
                    <label>人数 *</label>
                    <input type="number" id="ciPeople" class="form-input" min="1" value="4">
                </div>
                <div class="form-row">
                    <label>
                        <input type="checkbox" id="ciReserve" onchange="App.toggleReserveTime()">
                        仅预订（暂不开台）
                    </label>
                </div>
                <div id="reserveHint" style="display:none;" class="form-hint">
                    预订后 ${Pricing.getConfig().releaseMinutes} 分钟未到将自动释放
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="App.closeModal()">取消</button>
                <button class="btn btn-primary" onclick="App.submitCheckin()">确认开台</button>
            </div>
        `);
    },

    toggleReserveTime() {
        const hint = document.getElementById('reserveHint');
        const checked = document.getElementById('ciReserve').checked;
        if (hint) hint.style.display = checked ? 'block' : 'none';
    },

    submitCheckin() {
        const roomId = document.getElementById('ciRoom').value;
        const name = document.getElementById('ciName').value.trim();
        const phone = document.getElementById('ciPhone').value.trim();
        const people = parseInt(document.getElementById('ciPeople').value);
        const reserveOnly = document.getElementById('ciReserve').checked;

        if (!roomId || !name || !phone || !people) {
            this.toast('请填写完整信息', 'error');
            return;
        }

        Orders.create({ roomId, customerName: name, phone, peopleCount: people, reserveOnly });
        this.toast(reserveOnly ? '预订成功' : '开台成功', 'success');
        this.closeModal();
        this.refreshAll();
    },

    showRoomModal(roomId) {
        const room = roomId ? Rooms.getById(roomId) : null;
        this.openModal(`
            <div class="modal-header">
                <h3>${room ? '编辑包间' : '新增包间'}</h3>
                <button class="modal-close" onclick="App.closeModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="form-row">
                    <label>包间编号 *</label>
                    <input type="text" id="rmCode" class="form-input" value="${room?.code || ''}" placeholder="如：A101">
                </div>
                <div class="form-row">
                    <label>包间名称 *</label>
                    <input type="text" id="rmName" class="form-input" value="${room?.name || ''}" placeholder="如：豪华大包">
                </div>
                <div class="form-row">
                    <label>容纳人数 *</label>
                    <input type="number" id="rmCapacity" class="form-input" min="1" value="${room?.capacity || 4}">
                </div>
                <div class="form-row">
                    <label>基础设置</label>
                    <input type="text" id="rmAmenities" class="form-input" value="${room?.amenities || ''}" placeholder="如：空调、沙发、茶台">
                </div>
                <input type="hidden" id="rmId" value="${room?.id || ''}">
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="App.closeModal()">取消</button>
                <button class="btn btn-primary" onclick="App.submitRoom()">保存</button>
            </div>
        `);
    },

    submitRoom() {
        const id = document.getElementById('rmId').value;
        const code = document.getElementById('rmCode').value.trim();
        const name = document.getElementById('rmName').value.trim();
        const capacity = parseInt(document.getElementById('rmCapacity').value);
        const amenities = document.getElementById('rmAmenities').value.trim();

        if (!code || !name || !capacity) {
            this.toast('请填写完整信息', 'error');
            return;
        }

        Rooms.save({ id: id || undefined, code, name, capacity, amenities });
        this.toast('保存成功', 'success');
        this.closeModal();
        this.refreshAll();
    },

    deleteRoom(id) {
        const room = Rooms.getById(id);
        if (!room) return;
        if (room.status !== 'available') {
            this.toast('该包间正在使用中，无法删除', 'error');
            return;
        }
        if (!confirm(`确定删除包间「${room.name}」？`)) return;
        Rooms.delete(id);
        this.toast('删除成功', 'success');
        this.refreshAll();
    },

    showTimeSlotModal(slotId) {
        const slot = slotId ? Pricing.getTimeSlots().find(s => s.id === slotId) : null;
        this.openModal(`
            <div class="modal-header">
                <h3>${slot ? '编辑时段' : '新增时段'}</h3>
                <button class="modal-close" onclick="App.closeModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="form-row">
                    <label>时段名称 *</label>
                    <input type="text" id="tsName" class="form-input" value="${slot?.name || ''}" placeholder="如：晚间高峰">
                </div>
                <div class="form-row">
                    <label>开始时间 *</label>
                    <input type="time" id="tsStart" class="form-input" value="${slot?.startTime || '00:00'}">
                </div>
                <div class="form-row">
                    <label>结束时间 *</label>
                    <input type="time" id="tsEnd" class="form-input" value="${slot?.endTime || '00:00'}">
                </div>
                <div class="form-row">
                    <label>费率类型 *</label>
                    <select id="tsType" class="form-input">
                        <option value="peak" ${slot?.type === 'peak' ? 'selected' : ''}>高峰</option>
                        <option value="normal" ${slot?.type === 'normal' ? 'selected' : ''}>平峰</option>
                        <option value="valley" ${slot?.type === 'valley' ? 'selected' : ''}>低谷</option>
                    </select>
                </div>
                <div class="form-row">
                    <label>单价(元/小时) *</label>
                    <input type="number" id="tsPrice" class="form-input" min="0" step="0.01" value="${slot?.price || 30}">
                </div>
                <input type="hidden" id="tsId" value="${slot?.id || ''}">
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="App.closeModal()">取消</button>
                <button class="btn btn-primary" onclick="App.submitTimeSlot()">保存</button>
            </div>
        `);
    },

    submitTimeSlot() {
        const id = document.getElementById('tsId').value;
        const name = document.getElementById('tsName').value.trim();
        const startTime = document.getElementById('tsStart').value;
        const endTime = document.getElementById('tsEnd').value;
        const type = document.getElementById('tsType').value;
        const price = parseFloat(document.getElementById('tsPrice').value);

        if (!name || !startTime || !endTime || !price) {
            this.toast('请填写完整信息', 'error');
            return;
        }

        Pricing.saveTimeSlot({ id: id || undefined, name, startTime, endTime, type, price });
        this.toast('保存成功', 'success');
        this.closeModal();
        this.refreshAll();
    },

    deleteTimeSlot(id) {
        if (!confirm('确定删除该时段？')) return;
        Pricing.deleteTimeSlot(id);
        this.toast('删除成功', 'success');
        this.refreshAll();
    },

    showAddonModal(addonId) {
        const addon = addonId ? Pricing.getAddons().find(a => a.id === addonId) : null;
        this.openModal(`
            <div class="modal-header">
                <h3>${addon ? '编辑加购项目' : '新增加购项目'}</h3>
                <button class="modal-close" onclick="App.closeModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="form-row">
                    <label>项目名称 *</label>
                    <input type="text" id="adName" class="form-input" value="${addon?.name || ''}" placeholder="如：铁观音">
                </div>
                <div class="form-row">
                    <label>分类 *</label>
                    <select id="adCategory" class="form-input">
                        <option value="茶水" ${addon?.category === '茶水' ? 'selected' : ''}>茶水</option>
                        <option value="饮品" ${addon?.category === '饮品' ? 'selected' : ''}>饮品</option>
                        <option value="零食" ${addon?.category === '零食' ? 'selected' : ''}>零食</option>
                        <option value="其他" ${addon?.category === '其他' ? 'selected' : ''}>其他</option>
                    </select>
                </div>
                <div class="form-row">
                    <label>单价(元) *</label>
                    <input type="number" id="adPrice" class="form-input" min="0" step="0.01" value="${addon?.price || 0}">
                </div>
                <input type="hidden" id="adId" value="${addon?.id || ''}">
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="App.closeModal()">取消</button>
                <button class="btn btn-primary" onclick="App.submitAddon()">保存</button>
            </div>
        `);
    },

    submitAddon() {
        const id = document.getElementById('adId').value;
        const name = document.getElementById('adName').value.trim();
        const category = document.getElementById('adCategory').value;
        const price = parseFloat(document.getElementById('adPrice').value);

        if (!name || !price) {
            this.toast('请填写完整信息', 'error');
            return;
        }

        Pricing.saveAddon({ id: id || undefined, name, category, price });
        this.toast('保存成功', 'success');
        this.closeModal();
        this.refreshAll();
    },

    deleteAddon(id) {
        if (!confirm('确定删除该加购项目？')) return;
        Pricing.deleteAddon(id);
        this.toast('删除成功', 'success');
        this.refreshAll();
    },

    saveReleaseConfig() {
        const minutes = parseInt(document.getElementById('releaseMinutes').value);
        if (!minutes || minutes < 5 || minutes > 120) {
            this.toast('请输入5-120之间的数值', 'error');
            return;
        }
        Pricing.saveConfig({ releaseMinutes: minutes });
        this.toast('保存成功', 'success');
    },

    showOrderDetailModal(orderId) {
        const order = Orders.getAll().find(o => o.id === orderId);
        if (!order) return;
        const room = Rooms.getById(order.roomId);
        const now = new Date().toISOString();
        const mins = Math.round((new Date(now) - new Date(order.startTime)) / 60000);
        const feeResult = Pricing.calculateRoomFee(order.startTime, now);

        const segmentsHtml = feeResult.segments.map(s => `
            <div class="breakdown-item">
                <span>${s.slotName} <span class="tag ${UI.getRateTypeClass(s.slotType)}">${UI.getRateTypeLabel(s.slotType)}</span> (${s.durationHours}小时×¥${s.pricePerHour})</span>
                <span>${UI.formatMoney(s.cost)}</span>
            </div>
        `).join('');

        const addonsHtml = order.addons.length > 0
            ? order.addons.map(a => `
                <div class="breakdown-item">
                    <span>${a.name} × ${a.quantity}</span>
                    <span>${UI.formatMoney(a.subtotal)}</span>
                </div>
            `).join('')
            : '<div class="breakdown-item"><span style="color:#999;">暂无加购</span><span>-</span></div>';

        const addonsTotal = order.addons.reduce((sum, a) => sum + a.subtotal, 0);
        const total = feeResult.total + addonsTotal;

        this.openModal(`
            <div class="modal-header">
                <h3>${room?.code} ${room?.name} - 订单详情</h3>
                <button class="modal-close" onclick="App.closeModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="form-row">
                    <label>客人：${order.customerName} (${order.phone})，${order.peopleCount}人</label>
                </div>
                <div class="form-row">
                    <label>开始时间：${UI.formatDateTime(order.startTime)}</label>
                </div>
                <div class="form-row">
                    <label>已用时长：${UI.formatDuration(mins)}</label>
                </div>
                <div class="billing-breakdown">
                    <div style="font-weight:600;margin-bottom:8px;">台费明细（跨时段分段计费）</div>
                    ${segmentsHtml}
                    <div class="breakdown-total">
                        <span>台费小计</span>
                        <span>${UI.formatMoney(feeResult.total)}</span>
                    </div>
                </div>
                <div class="billing-breakdown">
                    <div style="font-weight:600;margin-bottom:8px;">加购项目</div>
                    ${addonsHtml}
                    <div class="breakdown-total">
                        <span>加购小计</span>
                        <span>${UI.formatMoney(addonsTotal)}</span>
                    </div>
                </div>
                <div class="breakdown-total" style="margin-top:12px;">
                    <span>当前合计</span>
                    <span style="color:#e91e63;">${UI.formatMoney(total)}</span>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="App.closeModal()">关闭</button>
                <button class="btn btn-warning" onclick="App.showAddonModalForOrder('${order.id}')">加购</button>
                <button class="btn btn-primary" onclick="App.showCheckoutModal('${order.id}')">结账</button>
            </div>
        `);
    },

    showReservedModal(orderId) {
        const order = Orders.getAll().find(o => o.id === orderId);
        if (!order) return;
        const room = Rooms.getById(order.roomId);

        this.openModal(`
            <div class="modal-header">
                <h3>预订确认 - ${room?.name}</h3>
                <button class="modal-close" onclick="App.closeModal()">×</button>
            </div>
            <div class="modal-body">
                <p>客人：${order.customerName} (${order.phone})</p>
                <p>人数：${order.peopleCount}人</p>
                <p>预订时间：${UI.formatDateTime(order.reservedAt)}</p>
                <p style="color:#ff9800;">注意：${Pricing.getConfig().releaseMinutes}分钟内未到将自动释放</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-danger" onclick="App.cancelOrder('${order.id}')">取消预订</button>
                <button class="btn btn-primary" onclick="App.checkinOrder('${order.id}')">确认入座</button>
            </div>
        `);
    },

    checkinOrder(orderId) {
        Orders.checkin(orderId);
        this.toast('已确认入座，开始计时', 'success');
        this.closeModal();
        this.refreshAll();
    },

    cancelOrder(orderId) {
        if (!confirm('确定取消该订单？')) return;
        Orders.cancel(orderId);
        this.toast('订单已取消', 'success');
        this.closeModal();
        this.refreshAll();
    },

    showAddonModalForOrder(orderId) {
        const order = Orders.getAll().find(o => o.id === orderId);
        if (!order) return;
        const addons = Pricing.getAddons();
        this.tempAddons = {};

        const addonItems = addons.map(a => {
            const existing = order.addons.find(x => x.addonId === a.id);
            const qty = existing ? existing.quantity : 0;
            if (qty > 0) this.tempAddons[a.id] = qty;
            return `
                <div class="addon-item ${qty > 0 ? 'selected' : ''}" data-addon-id="${a.id}">
                    <div>
                        <div style="font-weight:500;">${a.name}</div>
                        <div style="font-size:12px;color:#999;">${a.category} · ¥${a.price}</div>
                    </div>
                    <div class="addon-qty">
                        <button onclick="App.adjustAddonQty('${a.id}', -1)">-</button>
                        <span id="qty-${a.id}">${qty}</span>
                        <button onclick="App.adjustAddonQty('${a.id}', 1)">+</button>
                    </div>
                </div>
            `;
        }).join('');

        this.openModal(`
            <div class="modal-header">
                <h3>加购项目</h3>
                <button class="modal-close" onclick="App.closeModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="addon-list">${addonItems}</div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="App.closeModal()">取消</button>
                <button class="btn btn-primary" onclick="App.submitAddonsForOrder('${orderId}')">确认加购</button>
            </div>
        `);
    },

    adjustAddonQty(addonId, delta) {
        const current = this.tempAddons[addonId] || 0;
        const next = Math.max(0, current + delta);
        this.tempAddons[addonId] = next;
        const qtyEl = document.getElementById(`qty-${addonId}`);
        if (qtyEl) qtyEl.textContent = next;
        const itemEl = document.querySelector(`[data-addon-id="${addonId}"]`);
        if (itemEl) {
            itemEl.classList.toggle('selected', next > 0);
        }
    },

    submitAddonsForOrder(orderId) {
        const order = Orders.getAll().find(o => o.id === orderId);
        if (!order) return;

        for (const addon of order.addons) {
            Orders.removeAddon(orderId, addon.addonId);
        }

        for (const [addonId, qty] of Object.entries(this.tempAddons)) {
            if (qty > 0) {
                Orders.addAddon(orderId, addonId, qty);
            }
        }

        this.toast('加购已更新', 'success');
        this.closeModal();
        this.refreshAll();
    },

    showCheckoutModal(orderId) {
        const order = Orders.getAll().find(o => o.id === orderId);
        if (!order) return;
        const room = Rooms.getById(order.roomId);
        const endTime = new Date().toISOString();
        const mins = Math.round((new Date(endTime) - new Date(order.startTime)) / 60000);
        const feeResult = Pricing.calculateRoomFee(order.startTime, endTime);

        const segmentsHtml = feeResult.segments.map(s => `
            <div class="breakdown-item">
                <span>${s.slotName} <span class="tag ${UI.getRateTypeClass(s.slotType)}">${UI.getRateTypeLabel(s.slotType)}</span> (${s.durationHours}小时×¥${s.pricePerHour})</span>
                <span>${UI.formatMoney(s.cost)}</span>
            </div>
        `).join('');

        const addonsHtml = order.addons.length > 0
            ? order.addons.map(a => `
                <div class="breakdown-item">
                    <span>${a.name} × ${a.quantity}</span>
                    <span>${UI.formatMoney(a.subtotal)}</span>
                </div>
            `).join('')
            : '<div class="breakdown-item"><span style="color:#999;">暂无加购</span><span>-</span></div>';

        const addonsTotal = order.addons.reduce((sum, a) => sum + a.subtotal, 0);
        const total = feeResult.total + addonsTotal;

        this.openModal(`
            <div class="modal-header">
                <h3>结账确认 - ${room?.name}</h3>
                <button class="modal-close" onclick="App.closeModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="form-row">
                    <label>客人：${order.customerName} (${order.phone})，${order.peopleCount}人</label>
                </div>
                <div class="form-row">
                    <label>消费时长：${UI.formatDuration(mins)} (${UI.formatDateTime(order.startTime)} ~ ${UI.formatDateTime(endTime)})</label>
                </div>
                <div class="billing-breakdown">
                    <div style="font-weight:600;margin-bottom:8px;">台费明细（跨时段分段计费）</div>
                    ${segmentsHtml}
                    <div class="breakdown-total">
                        <span>台费小计</span>
                        <span>${UI.formatMoney(feeResult.total)}</span>
                    </div>
                </div>
                <div class="billing-breakdown">
                    <div style="font-weight:600;margin-bottom:8px;">加购项目</div>
                    ${addonsHtml}
                    <div class="breakdown-total">
                        <span>加购小计</span>
                        <span>${UI.formatMoney(addonsTotal)}</span>
                    </div>
                </div>
                <div class="breakdown-total" style="margin-top:12px;">
                    <span>应收合计</span>
                    <span style="color:#e91e63;font-size:20px;">${UI.formatMoney(total)}</span>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="App.closeModal()">取消</button>
                <button class="btn btn-primary" onclick="App.confirmCheckout('${orderId}')">确认结账</button>
            </div>
        `);
    },

    confirmCheckout(orderId) {
        const bill = Orders.checkout(orderId);
        if (bill) {
            this.toast(`结账成功，应收 ${UI.formatMoney(bill.total)}`, 'success');
            this.closeModal();
            this.refreshAll();
            setTimeout(() => this.showBillDetailModal(bill.id), 300);
        }
    },

    showBillDetailModal(billId) {
        const bill = Bills.getById(billId);
        if (!bill) return;

        const segmentsHtml = bill.segments.map(s => `
            <div class="breakdown-item">
                <span>${s.slotName} <span class="tag ${UI.getRateTypeClass(s.slotType)}">${UI.getRateTypeLabel(s.slotType)}</span> (${s.durationHours}小时×¥${s.pricePerHour})</span>
                <span>${UI.formatMoney(s.cost)}</span>
            </div>
        `).join('');

        const addonsHtml = bill.addons.length > 0
            ? bill.addons.map(a => `
                <div class="breakdown-item">
                    <span>${a.name} × ${a.quantity}</span>
                    <span>${UI.formatMoney(a.subtotal)}</span>
                </div>
            `).join('')
            : '<div class="breakdown-item"><span style="color:#999;">暂无加购</span><span>-</span></div>';

        this.openModal(`
            <div class="modal-header">
                <h3>账单详情 - ${bill.id}</h3>
                <button class="modal-close" onclick="App.closeModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="form-row">
                    <label>包间：${bill.roomName}</label>
                </div>
                <div class="form-row">
                    <label>客人：${bill.customerName} (${bill.phone})，${bill.peopleCount}人</label>
                </div>
                <div class="form-row">
                    <label>消费时长：${UI.formatDuration(bill.durationMinutes)}</label>
                </div>
                <div class="form-row">
                    <label>时段：${UI.formatDateTime(bill.startTime)} ~ ${UI.formatDateTime(bill.endTime)}</label>
                </div>
                <div class="billing-breakdown">
                    <div style="font-weight:600;margin-bottom:8px;">台费明细</div>
                    ${segmentsHtml}
                    <div class="breakdown-total">
                        <span>台费小计</span>
                        <span>${UI.formatMoney(bill.roomFee)}</span>
                    </div>
                </div>
                <div class="billing-breakdown">
                    <div style="font-weight:600;margin-bottom:8px;">加购项目</div>
                    ${addonsHtml}
                    <div class="breakdown-total">
                        <span>加购小计</span>
                        <span>${UI.formatMoney(bill.addonsTotal)}</span>
                    </div>
                </div>
                <div class="breakdown-total" style="margin-top:12px;">
                    <span>应收合计</span>
                    <span style="color:#e91e63;font-size:20px;">${UI.formatMoney(bill.total)}</span>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="App.closeModal()">关闭</button>
            </div>
        `);
    },

    showWaitingModal() {
        const rooms = Rooms.getAll();
        const roomOptions = '<option value="">任意包间</option>' + rooms.map(r =>
            `<option value="${r.id}">${r.code} ${r.name} (${r.capacity}人)</option>`
        ).join('');

        this.openModal(`
            <div class="modal-header">
                <h3>登记候补</h3>
                <button class="modal-close" onclick="App.closeModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="form-row">
                    <label>客人姓名 *</label>
                    <input type="text" id="wName" class="form-input" placeholder="请输入客人姓名">
                </div>
                <div class="form-row">
                    <label>联系电话 *</label>
                    <input type="text" id="wPhone" class="form-input" placeholder="请输入联系电话">
                </div>
                <div class="form-row">
                    <label>人数 *</label>
                    <input type="number" id="wPeople" class="form-input" min="1" value="4">
                </div>
                <div class="form-row">
                    <label>期望包间（可选）</label>
                    <select id="wRoom" class="form-input">${roomOptions}</select>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="App.closeModal()">取消</button>
                <button class="btn btn-primary" onclick="App.submitWaiting()">确认登记</button>
            </div>
        `);
    },

    submitWaiting() {
        const name = document.getElementById('wName').value.trim();
        const phone = document.getElementById('wPhone').value.trim();
        const people = parseInt(document.getElementById('wPeople').value);
        const preferredRoomId = document.getElementById('wRoom').value;

        if (!name || !phone || !people) {
            this.toast('请填写完整信息', 'error');
            return;
        }

        const entry = Waiting.add({ customerName: name, phone, peopleCount: people, preferredRoomId: preferredRoomId || null });
        this.toast(`候补登记成功，排队号 #${entry.queueNumber}`, 'success');
        this.closeModal();
        this.refreshAll();
    },

    removeWaiting(id) {
        if (!confirm('确定取消该候补？')) return;
        Waiting.remove(id);
        this.toast('已取消', 'success');
        this.refreshAll();
    },

    acceptWaiting(waitingId) {
        const order = Waiting.acceptWaiting(waitingId);
        if (order) {
            this.toast('候补客人已入座，开始计时', 'success');
            this.closeModal();
            this.refreshAll();
        } else {
            this.toast('操作失败', 'error');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
