const Storage = {
    KEYS: {
        ROOMS: 'chess_rooms',
        TIME_SLOTS: 'chess_time_slots',
        ADDONS: 'chess_addons',
        ORDERS: 'chess_orders',
        BILLS: 'chess_bills',
        WAITING: 'chess_waiting',
        CONFIG: 'chess_config',
        NEXT_QUEUE: 'chess_next_queue'
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
        if (!this.get(this.KEYS.ORDERS)) this.set(this.KEYS.ORDERS, []);
        if (!this.get(this.KEYS.BILLS)) this.set(this.KEYS.BILLS, []);
        if (!this.get(this.KEYS.WAITING)) this.set(this.KEYS.WAITING, []);
        if (!this.get(this.KEYS.CONFIG)) this.set(this.KEYS.CONFIG, { releaseMinutes: 15, notifyTimeoutMinutes: 10 });
        if (!this.get(this.KEYS.NEXT_QUEUE)) {
            const waiting = this.get(this.KEYS.WAITING, []);
            const maxNum = Math.max(0, ...waiting.map(w => w.globalQueueNumber || w.queueNumber || 0));
            this.set(this.KEYS.NEXT_QUEUE, maxNum + 1);
        }
    }
};

const Pricing = {
    getTimeSlots() { return Storage.get(Storage.KEYS.TIME_SLOTS, []); },
    saveTimeSlot(slot) {
        const slots = this.getTimeSlots();
        if (slot.id) { const i = slots.findIndex(s => s.id === slot.id); if (i >= 0) slots[i] = slot; }
        else { slot.id = 'ts' + Date.now(); slots.push(slot); }
        Storage.set(Storage.KEYS.TIME_SLOTS, slots);
    },
    deleteTimeSlot(id) { Storage.set(Storage.KEYS.TIME_SLOTS, this.getTimeSlots().filter(s => s.id !== id)); },
    getAddons() { return Storage.get(Storage.KEYS.ADDONS, []); },
    saveAddon(addon) {
        const addons = this.getAddons();
        if (addon.id) { const i = addons.findIndex(a => a.id === addon.id); if (i >= 0) addons[i] = addon; }
        else { addon.id = 'a' + Date.now(); addons.push(addon); }
        Storage.set(Storage.KEYS.ADDONS, addons);
    },
    deleteAddon(id) { Storage.set(Storage.KEYS.ADDONS, this.getAddons().filter(a => a.id !== id)); },
    getConfig() { return Storage.get(Storage.KEYS.CONFIG, { releaseMinutes: 15, notifyTimeoutMinutes: 10 }); },
    saveConfig(config) { Storage.set(Storage.KEYS.CONFIG, config); },
    timeToMinutes(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; },
    getSlotForTime(mod) {
        for (const s of this.getTimeSlots()) {
            const st = this.timeToMinutes(s.startTime); let en = this.timeToMinutes(s.endTime);
            if (en === 0 || en === 1440) en = 1440;
            if (mod >= st && mod < en) return s;
        }
        return null;
    },
    calculateBillableSegments(startTime, endTime) {
        const segs = []; let cur = new Date(startTime).getTime(); const end = new Date(endTime).getTime();
        if (end <= cur) return segs;
        while (cur < end) {
            const mod = new Date(cur).getHours() * 60 + new Date(cur).getMinutes();
            const slot = this.getSlotForTime(mod);
            if (!slot) { cur += 60000; continue; }
            let slotEnd = this.timeToMinutes(slot.endTime); if (slotEnd === 0 || slotEnd === 1440) slotEnd = 1440;
            const dayStart = new Date(cur); dayStart.setHours(0, 0, 0, 0);
            const segEnd = Math.min(end, dayStart.getTime() + slotEnd * 60000);
            const dm = Math.max(1, Math.round((segEnd - cur) / 60000));
            const dh = dm / 60;
            segs.push({ slotName: slot.name, slotType: slot.type, pricePerHour: slot.price,
                startTime: new Date(cur).toLocaleString('zh-CN'), endTime: new Date(segEnd).toLocaleString('zh-CN'),
                durationMinutes: dm, durationHours: dh.toFixed(2), cost: parseFloat((dh * slot.price).toFixed(2)) });
            cur = segEnd;
        }
        return segs;
    },
    calculateRoomFee(st, en) {
        const segs = this.calculateBillableSegments(st, en);
        return { segments: segs, total: parseFloat(segs.reduce((s, x) => s + x.cost, 0).toFixed(2)) };
    }
};

const Rooms = {
    getAll() { return Storage.get(Storage.KEYS.ROOMS, []); },
    getById(id) { return this.getAll().find(r => r.id === id); },
    save(room) {
        const rooms = this.getAll();
        if (room.id) {
            const i = rooms.findIndex(r => r.id === room.id);
            if (i >= 0) { const o = rooms[i]; rooms[i] = { ...o, code: room.code, name: room.name, capacity: room.capacity, amenities: room.amenities }; }
        } else { room.id = 'r' + Date.now(); room.status = 'available'; rooms.push(room); }
        Storage.set(Storage.KEYS.ROOMS, rooms);
    },
    delete(id) { Storage.set(Storage.KEYS.ROOMS, this.getAll().filter(r => r.id !== id)); },
    updateStatus(id, status) { const rooms = this.getAll(); const r = rooms.find(x => x.id === id); if (r) { r.status = status; Storage.set(Storage.KEYS.ROOMS, rooms); } },
    getAvailable() { return this.getAll().filter(r => r.status === 'available'); },
    clearNotifiedWaiting(id) {
        const rooms = this.getAll(); const r = rooms.find(x => x.id === id);
        if (r && r.status === 'notified') { delete r.notifiedWaitingId; r.status = 'available'; Storage.set(Storage.KEYS.ROOMS, rooms); }
    }
};

const Orders = {
    getAll() { return Storage.get(Storage.KEYS.ORDERS, []); },
    getActive() { return this.getAll().filter(o => o.status === 'active' || o.status === 'reserved'); },
    getByRoomId(rid) { return this.getAll().find(o => (o.status === 'active' || o.status === 'reserved') && o.roomId === rid); },
    save(order) { const orders = this.getAll(); if (order.id) { const i = orders.findIndex(o => o.id === order.id); if (i >= 0) orders[i] = order; } else { order.id = 'o' + Date.now(); orders.push(order); } Storage.set(Storage.KEYS.ORDERS, orders); },
    create(data) {
        const order = { id: 'o' + Date.now(), roomId: data.roomId, customerName: data.customerName, phone: data.phone, peopleCount: data.peopleCount, startTime: data.startTime || new Date().toISOString(), endTime: null, status: data.reserveOnly ? 'reserved' : 'active', reservedAt: data.reserveOnly ? new Date().toISOString() : null, addons: [], createdAt: new Date().toISOString() };
        this.save(order); Rooms.updateStatus(data.roomId, data.reserveOnly ? 'reserved' : 'occupied'); return order;
    },
    addAddon(oid, aid, qty) {
        const orders = this.getAll(); const o = orders.find(x => x.id === oid); if (!o) return;
        const info = Pricing.getAddons().find(a => a.id === aid); if (!info) return;
        const ex = o.addons.find(a => a.addonId === aid);
        if (ex) { ex.quantity += qty; ex.subtotal = parseFloat((ex.quantity * info.price).toFixed(2)); }
        else { o.addons.push({ addonId: aid, name: info.name, category: info.category, price: info.price, quantity: qty, subtotal: parseFloat((qty * info.price).toFixed(2)) }); }
        Storage.set(Storage.KEYS.ORDERS, orders);
    },
    removeAddon(oid, aid) { const orders = this.getAll(); const o = orders.find(x => x.id === oid); if (!o) return; o.addons = o.addons.filter(a => a.addonId !== aid); Storage.set(Storage.KEYS.ORDERS, orders); },
    checkin(oid) { const orders = this.getAll(); const o = orders.find(x => x.id === oid); if (!o || o.status !== 'reserved') return; o.status = 'active'; o.startTime = new Date().toISOString(); Storage.set(Storage.KEYS.ORDERS, orders); Rooms.updateStatus(o.roomId, 'occupied'); return o; },
    checkout(oid) {
        const orders = this.getAll(); const o = orders.find(x => x.id === oid); if (!o) return null;
        o.endTime = new Date().toISOString(); o.status = 'completed';
        const fee = Pricing.calculateRoomFee(o.startTime, o.endTime); const addT = o.addons.reduce((s, a) => s + a.subtotal, 0);
        const bill = { id: 'b' + Date.now(), orderId: o.id, roomId: o.roomId, roomName: Rooms.getById(o.roomId)?.name || '', customerName: o.customerName, phone: o.phone, peopleCount: o.peopleCount, startTime: o.startTime, endTime: o.endTime, durationMinutes: Math.round((new Date(o.endTime) - new Date(o.startTime)) / 60000), segments: fee.segments, roomFee: fee.total, addons: o.addons, addonsTotal: parseFloat(addT.toFixed(2)), total: parseFloat((fee.total + addT).toFixed(2)), createdAt: new Date().toISOString() };
        const bills = Bills.getAll(); bills.push(bill); Storage.set(Storage.KEYS.BILLS, bills);
        Storage.set(Storage.KEYS.ORDERS, orders.filter(x => x.id !== oid));
        Rooms.updateStatus(o.roomId, 'available'); Waiting.tryFillRoom(o.roomId); return bill;
    },
    cancel(oid) { const orders = this.getAll(); const o = orders.find(x => x.id === oid); if (!o) return; Storage.set(Storage.KEYS.ORDERS, orders.filter(x => x.id !== oid)); Rooms.updateStatus(o.roomId, 'available'); Waiting.tryFillRoom(o.roomId); },
    checkReleaseExpired() {
        const cfg = Pricing.getConfig(); const now = Date.now();
        const expired = this.getAll().filter(o => o.status === 'reserved' && o.reservedAt && (now - new Date(o.reservedAt).getTime() > cfg.releaseMinutes * 60000));
        expired.forEach(o => { this.cancel(o.id); App.toast(`预订超时：${Rooms.getById(o.roomId)?.name} 已自动释放，通知候补客人补位`, 'warning'); });
        return expired;
    }
};

const Bills = {
    getAll() { return Storage.get(Storage.KEYS.BILLS, []); },
    getById(id) { return this.getAll().find(b => b.id === id); },
    getTodayRevenue() { const t = new Date().toDateString(); return this.getAll().filter(b => new Date(b.createdAt).toDateString() === t).reduce((s, b) => s + b.total, 0); }
};

const Waiting = {
    getAll() { return Storage.get(Storage.KEYS.WAITING, []); },
    getActive() { return this.getAll().filter(w => w.status === 'waiting'); },
    addHistory(entry, action, detail) { if (!entry.history) entry.history = []; entry.history.push({ action, time: new Date().toISOString(), detail: detail || '' }); },
    migrateQueueNumbers() {
        const waiting = this.getAll(); if (!waiting.length) return;
        let changed = false;
        for (const w of waiting) {
            if (typeof w.globalQueueNumber !== 'number' || !w.globalQueueNumber) {
                if (typeof w.queueNumber === 'number' && w.queueNumber > 0) w.globalQueueNumber = w.queueNumber;
                changed = true;
            }
            if (!w.history) { w.history = []; changed = true; }
        }
        if (waiting.some(w => !w.globalQueueNumber)) {
            let next = Storage.get(Storage.KEYS.NEXT_QUEUE, 1);
            const used = new Set(waiting.filter(w => w.globalQueueNumber > 0).map(w => w.globalQueueNumber));
            for (const e of [...waiting].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))) {
                if (!e.globalQueueNumber) { while (used.has(next)) next++; e.globalQueueNumber = next; used.add(next); next++; changed = true; }
            }
            Storage.set(Storage.KEYS.NEXT_QUEUE, Math.max(...waiting.map(w => w.globalQueueNumber)) + 1);
        }
        if (changed) Storage.set(Storage.KEYS.WAITING, waiting);
    },
    reconcileRoomStates() {
        const rooms = Rooms.getAll(); const waiting = this.getAll(); let rc = false;
        for (const r of rooms) {
            if (r.status === 'notified' && r.notifiedWaitingId) {
                const w = waiting.find(x => x.id === r.notifiedWaitingId);
                if (!w || w.status !== 'notified' || w.notifiedRoomId !== r.id) { delete r.notifiedWaitingId; r.status = 'available'; rc = true; }
            }
        }
        for (const w of waiting) {
            if (w.status === 'notified' && w.notifiedRoomId) {
                const r = rooms.find(x => x.id === w.notifiedRoomId);
                if (!r || r.status !== 'notified' || r.notifiedWaitingId !== w.id) { w.status = 'waiting'; w.notifiedRoomId = null; w.notifiedAt = null; this.addHistory(w, 'revert_to_waiting', '刷新校验：包间状态不一致'); }
            }
        }
        if (rc) Storage.set(Storage.KEYS.ROOMS, rooms);
        Storage.set(Storage.KEYS.WAITING, waiting);
    },
    add(data) {
        const waiting = this.getAll(); const num = Storage.get(Storage.KEYS.NEXT_QUEUE, 1);
        Storage.set(Storage.KEYS.NEXT_QUEUE, num + 1);
        const entry = { id: 'w' + Date.now(), globalQueueNumber: num, customerName: data.customerName, phone: data.phone, peopleCount: data.peopleCount, preferredRoomId: data.preferredRoomId || null, createdAt: new Date().toISOString(), status: 'waiting', notifiedRoomId: null, notifiedAt: null, history: [{ action: 'register', time: new Date().toISOString(), detail: '登记候补' }] };
        waiting.push(entry); Storage.set(Storage.KEYS.WAITING, waiting); return entry;
    },
    cancelWaiting(id) {
        const waiting = this.getAll(); const e = waiting.find(w => w.id === id); if (!e) return;
        if (e.status === 'notified' && e.notifiedRoomId) Rooms.clearNotifiedWaiting(e.notifiedRoomId);
        e.status = 'cancelled'; e.notifiedRoomId = null; e.notifiedAt = null;
        this.addHistory(e, 'cancel', '取消候补'); Storage.set(Storage.KEYS.WAITING, waiting);
    },
    giveUpNotified(id) {
        const waiting = this.getAll(); const e = waiting.find(w => w.id === id); if (!e || e.status !== 'notified') return;
        const rid = e.notifiedRoomId; const rn = rid ? (Rooms.getById(rid)?.name || '') : '';
        if (rid) Rooms.clearNotifiedWaiting(rid);
        e.status = 'cancelled'; e.notifiedRoomId = null; e.notifiedAt = null;
        this.addHistory(e, 'give_up', `放弃包间「${rn}」的候补占位`); Storage.set(Storage.KEYS.WAITING, waiting);
        if (rid) Waiting.tryFillRoom(rid);
    },
    tryFillRoom(roomId) {
        const room = Rooms.getById(roomId); if (!room || room.status !== 'available') return null;
        const waiting = this.getAll();
        const match = waiting.filter(w => w.status === 'waiting' && (!w.preferredRoomId || w.preferredRoomId === roomId) && w.peopleCount <= room.capacity).sort((a, b) => a.globalQueueNumber - b.globalQueueNumber)[0];
        if (match) {
            match.status = 'notified'; match.notifiedRoomId = roomId; match.notifiedAt = new Date().toISOString();
            this.addHistory(match, 'notify', `通知入住包间「${room.name}」`);
            const rooms = Rooms.getAll(); const r = rooms.find(x => x.id === roomId);
            if (r) { r.status = 'notified'; r.notifiedWaitingId = match.id; Storage.set(Storage.KEYS.ROOMS, rooms); }
            Storage.set(Storage.KEYS.WAITING, waiting);
            App.toast(`候补通知：${match.customerName} (${match.phone}) 可入住 ${room.name}，已临时占位`, 'success');
            return match;
        }
        return null;
    },
    manualNotify(wid, rid) {
        const room = Rooms.getById(rid);
        if (!room) return { success: false, reason: '包间不存在' };
        if (room.status !== 'available') return { success: false, reason: `包间「${room.name}」当前状态为「${UI.getStatusLabel(room.status)}」，不可用` };
        const waiting = this.getAll(); const e = waiting.find(w => w.id === wid);
        if (!e) return { success: false, reason: '候补记录不存在' };
        if (e.status !== 'waiting') return { success: false, reason: `该候补当前状态为「${UI.getStatusLabel(e.status)}」，无法通知` };
        if (e.peopleCount > room.capacity) return { success: false, reason: `该候补${e.peopleCount}人超过包间容量${room.capacity}人` };
        e.status = 'notified'; e.notifiedRoomId = rid; e.notifiedAt = new Date().toISOString();
        this.addHistory(e, 'manual_notify', `手动通知入住包间「${room.name}」`);
        const rooms = Rooms.getAll(); const r = rooms.find(x => x.id === rid);
        if (r) { r.status = 'notified'; r.notifiedWaitingId = e.id; Storage.set(Storage.KEYS.ROOMS, rooms); }
        Storage.set(Storage.KEYS.WAITING, waiting);
        return { success: true };
    },
    acceptWaiting(wid) {
        const waiting = this.getAll(); const e = waiting.find(w => w.id === wid);
        if (!e) return { success: false, reason: '候补记录不存在' };
        if (e.status !== 'notified') return { success: false, reason: `当前状态为「${UI.getStatusLabel(e.status)}」，无法直接入座` };
        if (!e.notifiedRoomId) return { success: false, reason: '该候补未关联包间信息' };
        const room = Rooms.getById(e.notifiedRoomId);
        if (!room) { e.status = 'waiting'; e.notifiedRoomId = null; e.notifiedAt = null; this.addHistory(e, 'accept_failed', '包间不存在，退回等待'); Storage.set(Storage.KEYS.WAITING, waiting); return { success: false, reason: '关联的包间已不存在，已自动退回等待队列' }; }
        if (room.status !== 'notified' || room.notifiedWaitingId !== e.id) { e.status = 'waiting'; e.notifiedRoomId = null; e.notifiedAt = null; this.addHistory(e, 'accept_failed', `包间「${room.name}」状态为「${UI.getStatusLabel(room.status)}」不可用，退回等待`); Storage.set(Storage.KEYS.WAITING, waiting); return { success: false, reason: `包间「${room.name}」当前状态为「${UI.getStatusLabel(room.status)}」，已被占用无法入座，已退回等待队列` }; }
        const rooms = Rooms.getAll(); const r = rooms.find(x => x.id === e.notifiedRoomId);
        if (r) { delete r.notifiedWaitingId; Storage.set(Storage.KEYS.ROOMS, rooms); }
        const order = Orders.create({ roomId: e.notifiedRoomId, customerName: e.customerName, phone: e.phone, peopleCount: e.peopleCount, reserveOnly: false });
        e.status = 'seated'; this.addHistory(e, 'seated', `确认入座包间「${room.name}」，订单号 ${order.id}`);
        Storage.set(Storage.KEYS.WAITING, waiting); return { success: true, order };
    },
    checkNotifyTimeout() {
        const cfg = Pricing.getConfig(); const tms = (cfg.notifyTimeoutMinutes || 10) * 60000; const now = Date.now();
        const waiting = this.getAll(); const timed = []; const rooms = Rooms.getAll();
        for (const e of waiting) { if (e.status === 'notified' && e.notifiedAt && (now - new Date(e.notifiedAt).getTime() > tms)) timed.push(e); }
        for (const e of timed) {
            const rid = e.notifiedRoomId; const rn = rid ? (Rooms.getById(rid)?.name || '') : '';
            if (rid) {
                const r = rooms.find(x => x.id === rid);
                if (r && r.status === 'notified' && r.notifiedWaitingId === e.id) { delete r.notifiedWaitingId; r.status = 'available'; Storage.set(Storage.KEYS.ROOMS, rooms); }
            }
            e.status = 'waiting'; e.notifiedRoomId = null; e.notifiedAt = null;
            this.addHistory(e, 'notify_timeout', `通知超时未确认，释放包间「${rn}」，自动退回队列`);
            App.toast(`候补通知超时：${e.customerName} 在包间「${rn}」未确认，已释放，下一位可继续补位`, 'warning');
            if (rid) {
                Storage.set(Storage.KEYS.WAITING, waiting);
                setTimeout(() => { const next = Waiting.tryFillRoom(rid); if (next) App.refreshAll(); }, 200);
                continue;
            }
        }
        if (timed.length) Storage.set(Storage.KEYS.WAITING, waiting);
        return timed;
    },
    getShiftTag(hour) {
        if (hour >= 6 && hour < 12) return { key: 'morning', label: '早班 (6:00-12:00)' };
        if (hour >= 12 && hour < 18) return { key: 'afternoon', label: '午班 (12:00-18:00)' };
        if (hour >= 18 && hour < 24) return { key: 'night', label: '晚班 (18:00-24:00)' };
        return { key: 'late-night', label: '夜班 (0:00-6:00)' };
    }
};

const UI = {
    formatDuration(m) { const h = Math.floor(m / 60); const mi = m % 60; return h > 0 ? `${h}小时${mi}分钟` : `${mi}分钟`; },
    formatMoney(n) { return '¥' + parseFloat(n || 0).toFixed(2); },
    formatDateTime(iso) { return iso ? new Date(iso).toLocaleString('zh-CN') : '-'; },
    formatTime(iso) { return iso ? new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '-'; },
    getRateTypeLabel(t) { return { peak: '高峰', normal: '平峰', valley: '低谷' }[t] || t; },
    getRateTypeClass(t) { return t || 'normal'; },
    getStatusLabel(s) { return { available: '空闲', occupied: '使用中', reserved: '已预订', notified: '候补占位', active: '进行中', completed: '已完成', waiting: '等待中', seated: '已入座', cancelled: '已取消' }[s] || s; },
    getActionLabel(a) { return { register: '登记', notify: '自动通知', manual_notify: '手动通知', accept_failed: '入座失败', seated: '确认入座', give_up: '放弃', cancel: '取消', notify_timeout: '通知超时', revert_to_waiting: '状态回退' }[a] || a; },
    renderHistoryTimeline(hist) {
        if (!hist || !hist.length) return '<span style="color:#999;font-size:12px;">-</span>';
        return '<div class="history-timeline">' + hist.map(h => `<div class="history-item">${UI.formatTime(h.time)} ${UI.getActionLabel(h.action)}${h.detail ? ' · ' + h.detail : ''}</div>`).join('') + '</div>';
    }
};

const App = {
    currentTab: 'dashboard', refreshInterval: null, tempAddons: {}, _shiftSummaries: [],
    init() { Storage.init(); Waiting.migrateQueueNumbers(); Waiting.reconcileRoomStates(); this.bindTabs(); this.startClock(); this.startAutoRefresh(); this.refreshAll(); this.renderBillDateFilter(); },
    bindTabs() { document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => this.switchTab(b.dataset.tab))); },
    switchTab(tab) { this.currentTab = tab; document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab)); document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === tab)); this.refreshAll(); },
    startClock() { const u = () => { const e = document.getElementById('currentTime'); if (e) e.textContent = new Date().toLocaleString('zh-CN'); }; u(); setInterval(u, 1000); },
    startAutoRefresh() { this.refreshInterval = setInterval(() => { Orders.checkReleaseExpired(); Waiting.checkNotifyTimeout(); this.refreshAll(); }, 10000); },
    refreshAll() { this.refreshDashboard(); this.refreshRoomsTable(); this.refreshTimeSlotsTable(); this.refreshAddonsTable(); this.refreshBillsTable(); this.refreshWaitingTable(); this.refreshConfig(); },
    refreshConfig() { const c = Pricing.getConfig(); const i1 = document.getElementById('releaseMinutes'); if (i1) i1.value = c.releaseMinutes; const i2 = document.getElementById('notifyTimeoutMinutes'); if (i2) i2.value = c.notifyTimeoutMinutes || 10; },
    refreshDashboard() {
        const rooms = Rooms.getAll();
        const e1 = document.getElementById('statUsing'); if (e1) e1.textContent = rooms.filter(r => r.status === 'occupied' || r.status === 'notified').length;
        const e2 = document.getElementById('statAvailable'); if (e2) e2.textContent = rooms.filter(r => r.status === 'available').length;
        const e3 = document.getElementById('statWaiting'); if (e3) e3.textContent = Waiting.getActive().length;
        const e4 = document.getElementById('statRevenue'); if (e4) e4.textContent = Bills.getTodayRevenue().toFixed(2);
        this.renderRoomsGrid(); this.renderActiveOrdersTable(); this.renderTimeline();
    },
    renderTimeline() {
        const hoursEl = document.getElementById('timelineHours'); const bodyEl = document.getElementById('timelineBody');
        if (!hoursEl || !bodyEl) return;
        let hHtml = '';
        for (let h = 0; h < 24; h++) { hHtml += `<div class="timeline-hour-label ${h === 0 ? 'first' : ''}">${h.toString().padStart(2, '0')}:00</div>`; }
        hoursEl.innerHTML = hHtml;
        const today = new Date(); const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const dayEnd = dayStart + 24 * 3600 * 1000; const totalMs = dayEnd - dayStart;
        const allOrders = Orders.getAll().concat(Bills.getAll().map(b => ({ id: b.orderId, roomId: b.roomId, customerName: b.customerName, startTime: b.startTime, endTime: b.endTime, status: 'completed', reservedAt: null })));
        const allWaiting = Waiting.getAll().filter(w => w.status === 'notified' && w.notifiedRoomId);
        const rooms = Rooms.getAll(); let bHtml = '';
        for (const room of rooms) {
            const segments = [];
            for (const o of allOrders.filter(x => x.roomId === room.id)) {
                const st = Math.max(dayStart, new Date(o.startTime).getTime());
                const en = Math.min(dayEnd, o.endTime ? new Date(o.endTime).getTime() : (o.status === 'completed' ? st + 3600000 : Date.now()));
                if (en > st) segments.push({ type: o.status === 'reserved' ? 'reserved' : 'occupied', start: st, end: en, label: `${o.customerName}`, orderId: o.id });
            }
            for (const w of allWaiting.filter(x => x.notifiedRoomId === room.id)) {
                const st = Math.max(dayStart, new Date(w.notifiedAt).getTime());
                const en = Math.min(dayEnd, st + 30 * 60000);
                if (en > st) segments.push({ type: 'notified', start: st, end: en, label: `#${w.globalQueueNumber} ${w.customerName}`, waitingId: w.id });
            }
            segments.sort((a, b) => a.start - b.start);
            let trackHtml = '';
            for (const seg of segments) {
                const left = ((seg.start - dayStart) / totalMs) * 100;
                const width = Math.max(2, ((seg.end - seg.start) / totalMs) * 100);
                const click = seg.type === 'notified' ? `App.showNotifiedDetailModal('${room.id}','${seg.waitingId}')` : `App.showBillOrOrder('${seg.orderId}')`;
                trackHtml += `<div class="timeline-block ${seg.type}" style="left:${left}%;width:${width}%;" onclick="${click}" title="${seg.label} ${new Date(seg.start).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}~${new Date(seg.end).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}">${seg.label}</div>`;
            }
            bHtml += `<div class="timeline-row"><div class="timeline-room-label">${room.code} ${room.name}</div><div class="timeline-track">${trackHtml}</div></div>`;
        }
        bodyEl.innerHTML = bHtml;
    },
    showBillOrOrder(id) {
        const bill = Bills.getAll().find(b => b.orderId === id);
        if (bill) { this.showBillDetailModal(bill.id); return; }
        const order = Orders.getAll().find(o => o.id === id);
        if (order) {
            if (order.status === 'reserved') this.showReservedModal(order.id);
            else this.showOrderDetailModal(order.id);
        }
    },
    renderRoomsGrid() {
        const grid = document.getElementById('roomsGrid'); if (!grid) return;
        const rooms = Rooms.getAll(); const wl = Waiting.getAll();
        grid.innerHTML = rooms.map(room => {
            const order = Orders.getByRoomId(room.id); let info = '';
            if (room.status === 'notified' && room.notifiedWaitingId) { const we = wl.find(w => w.id === room.notifiedWaitingId); info = `<span style="color:#e65100;">候补待入：${we ? we.customerName + ' (#' + we.globalQueueNumber + ')' : '占位中'}</span>`; }
            else if (order) { if (order.status === 'active') { const m = Math.round((Date.now() - new Date(order.startTime).getTime()) / 60000); info = `${order.customerName} · ${UI.formatDuration(m)} · ${UI.formatMoney(Pricing.calculateRoomFee(order.startTime, new Date().toISOString()).total)}`; } else if (order.status === 'reserved') info = `预订：${order.customerName}`; }
            return `<div class="room-card ${room.status}" onclick="App.onRoomCardClick('${room.id}')"><div class="room-number">${room.code}</div><div class="room-name">${room.name}</div><span class="room-status ${room.status}">${UI.getStatusLabel(room.status)}</span><div class="room-info">${info || '容纳' + room.capacity + '人'}</div></div>`;
        }).join('');
    },
    onRoomCardClick(rid) {
        const room = Rooms.getById(rid); if (!room) return; const order = Orders.getByRoomId(rid);
        if (room.status === 'available') this.showCheckinModal(rid);
        else if (room.status === 'notified') { const we = Waiting.getAll().find(w => w.id === room.notifiedWaitingId); if (we) this.showNotifiedDetailModal(rid, we.id); }
        else if (order && order.status === 'active') this.showOrderDetailModal(order.id);
        else if (order && order.status === 'reserved') this.showReservedModal(order.id);
    },
    renderActiveOrdersTable() {
        const tbody = document.querySelector('#activeOrdersTable tbody'); if (!tbody) return;
        const orders = Orders.getActive().filter(o => o.status === 'active');
        if (!orders.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state">暂无进行中的订单</td></tr>'; return; }
        tbody.innerHTML = orders.map(o => {
            const r = Rooms.getById(o.roomId); const m = Math.round((Date.now() - new Date(o.startTime).getTime()) / 60000);
            return `<tr><td><strong>${r?.code} ${r?.name}</strong></td><td>${o.customerName}</td><td>${UI.formatDateTime(o.startTime)}</td><td>${UI.formatDuration(m)}</td><td>${UI.formatMoney(Pricing.calculateRoomFee(o.startTime, new Date().toISOString()).total)}</td><td>${o.addons.length ? o.addons.map(a => a.name + '×' + a.quantity).join('，') : '-'}</td><td><button class="btn btn-sm btn-secondary" onclick="App.showAddonModalForOrder('${o.id}')">加购</button> <button class="btn btn-sm btn-primary" onclick="App.showCheckoutModal('${o.id}')">结账</button></td></tr>`;
        }).join('');
    },
    refreshRoomsTable() {
        const tbody = document.querySelector('#roomsTable tbody'); if (!tbody) return;
        const rooms = Rooms.getAll(); if (!rooms.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty-state">暂无包间数据</td></tr>'; return; }
        tbody.innerHTML = rooms.map(r => `<tr><td><strong>${r.code}</strong></td><td>${r.name}</td><td>${r.capacity}人</td><td>${r.amenities || '-'}</td><td><span class="room-status ${r.status}">${UI.getStatusLabel(r.status)}</span></td><td><button class="btn btn-sm btn-secondary" onclick="App.showRoomModal('${r.id}')">编辑</button> <button class="btn btn-sm btn-danger" onclick="App.deleteRoom('${r.id}')">删除</button></td></tr>`).join('');
    },
    refreshTimeSlotsTable() {
        const tbody = document.querySelector('#timeSlotsTable tbody'); if (!tbody) return;
        const slots = Pricing.getTimeSlots().sort((a, b) => Pricing.timeToMinutes(a.startTime) - Pricing.timeToMinutes(b.startTime));
        if (!slots.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty-state">暂无时段数据</td></tr>'; return; }
        tbody.innerHTML = slots.map(s => `<tr><td>${s.name}</td><td>${s.startTime}</td><td>${s.endTime}</td><td><span class="tag ${UI.getRateTypeClass(s.type)}">${UI.getRateTypeLabel(s.type)}</span></td><td>¥${s.price}/小时</td><td><button class="btn btn-sm btn-secondary" onclick="App.showTimeSlotModal('${s.id}')">编辑</button> <button class="btn btn-sm btn-danger" onclick="App.deleteTimeSlot('${s.id}')">删除</button></td></tr>`).join('');
    },
    refreshAddonsTable() {
        const tbody = document.querySelector('#addonsTable tbody'); if (!tbody) return;
        const addons = Pricing.getAddons(); if (!addons.length) { tbody.innerHTML = '<tr><td colspan="4" class="empty-state">暂无加购项目</td></tr>'; return; }
        tbody.innerHTML = addons.map(a => `<tr><td>${a.name}</td><td>${a.category}</td><td>¥${a.price}</td><td><button class="btn btn-sm btn-secondary" onclick="App.showAddonModal('${a.id}')">编辑</button> <button class="btn btn-sm btn-danger" onclick="App.deleteAddon('${a.id}')">删除</button></td></tr>`).join('');
    },
    renderBillDateFilter() { const e = document.getElementById('billDateFilter'); if (e) e.value = new Date().toISOString().split('T')[0]; },
    refreshBillsTable() {
        const tbody = document.querySelector('#billsTable tbody'); if (!tbody) return;
        let bills = Bills.getAll(); const df = document.getElementById('billDateFilter')?.value;
        if (df) bills = bills.filter(b => new Date(b.createdAt).toISOString().split('T')[0] === df);
        bills.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (!bills.length) { tbody.innerHTML = '<tr><td colspan="10" class="empty-state">暂无账单数据</td></tr>'; return; }
        tbody.innerHTML = bills.map(b => `<tr><td><strong>${b.id}</strong></td><td>${b.roomName}</td><td>${b.customerName}</td><td>${UI.formatDateTime(b.startTime)}</td><td>${UI.formatDateTime(b.endTime)}</td><td>${UI.formatDuration(b.durationMinutes)}</td><td>${UI.formatMoney(b.roomFee)}</td><td>${UI.formatMoney(b.addonsTotal)}</td><td><strong>${UI.formatMoney(b.total)}</strong></td><td><button class="btn btn-sm btn-secondary" onclick="App.showBillDetailModal('${b.id}')">详情</button></td></tr>`).join('');
    },
    filterBills() { this.refreshBillsTable(); const v = document.getElementById('billViewSwitch')?.value; if (v === 'shift') this.renderShiftSummary(); },
    renderWaitingRoomFilter() {
        const modeSel = document.getElementById('wfRoomMode'); const roomSel = document.getElementById('wfRoom');
        if (roomSel) { const cur = roomSel.value; roomSel.innerHTML = '<option value="">全部包间</option>' + Rooms.getAll().map(r => `<option value="${r.id}">${r.code} ${r.name}</option>`).join(''); roomSel.value = cur; }
        if (modeSel && roomSel) { roomSel.style.display = modeSel.value === 'custom' ? '' : 'none'; }
        const smartSel = document.getElementById('smartRoomSelect'); if (smartSel) { const cur = smartSel.value; smartSel.innerHTML = '<option value="">请选择包间</option>' + Rooms.getAll().map(r => `<option value="${r.id}">${r.code} ${r.name} (${r.capacity}人)</option>`).join(''); smartSel.value = cur; }
    },
    switchWaitingSubTab(tab) {
        document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.subtab === tab));
        const lv = document.getElementById('waitingListView'); const sv = document.getElementById('waitingSmartView');
        if (lv) lv.style.display = tab === 'list' ? '' : 'none';
        if (sv) sv.style.display = tab === 'smart' ? '' : 'none';
        if (tab === 'smart') { this.renderWaitingRoomFilter(); this.refreshSmartRecommend(); }
    },
    resetWaitingFilters() { const m = document.getElementById('wfRoomMode'); if (m) m.value = ''; const s = document.getElementById('wfRoom'); if (s) s.value = ''; const st = document.getElementById('wfStatus'); if (st) st.value = ''; const mn = document.getElementById('wfPeopleMin'); if (mn) mn.value = ''; const mx = document.getElementById('wfPeopleMax'); if (mx) mx.value = ''; this.renderWaitingRoomFilter(); this.refreshWaitingTable(); },
    refreshWaitingTable() {
        const tbody = document.querySelector('#waitingTable tbody'); if (!tbody) return;
        this.renderWaitingRoomFilter();
        let waiting = Waiting.getAll().sort((a, b) => a.globalQueueNumber - b.globalQueueNumber);
        const mode = document.getElementById('wfRoomMode')?.value || '';
        const rf = document.getElementById('wfRoom')?.value; const sf = document.getElementById('wfStatus')?.value;
        const pmin = parseInt(document.getElementById('wfPeopleMin')?.value) || 0; const pmax = parseInt(document.getElementById('wfPeopleMax')?.value) || 999;
        if (mode === 'any') waiting = waiting.filter(w => !w.preferredRoomId);
        else if (mode === 'specific') waiting = waiting.filter(w => !!w.preferredRoomId);
        else if (mode === 'custom' && rf) waiting = waiting.filter(w => w.preferredRoomId === rf || w.notifiedRoomId === rf);
        else if (rf) waiting = waiting.filter(w => w.preferredRoomId === rf || w.notifiedRoomId === rf || !w.preferredRoomId);
        if (sf) waiting = waiting.filter(w => w.status === sf);
        if (pmin > 0 || pmax < 999) waiting = waiting.filter(w => w.peopleCount >= pmin && w.peopleCount <= pmax);
        if (!waiting.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty-state">暂无候补记录</td></tr>'; return; }
        const cfg = Pricing.getConfig();
        tbody.innerHTML = waiting.map(w => {
            const room = w.preferredRoomId ? Rooms.getById(w.preferredRoomId) : null;
            const nr = w.notifiedRoomId ? Rooms.getById(w.notifiedRoomId) : null;
            let acts = '';
            if (w.status === 'waiting') acts = `<button class="btn btn-sm btn-warning" onclick="App.showManualNotifyForWaiting('${w.id}')">通知</button> <button class="btn btn-sm btn-danger" onclick="App.cancelWaiting('${w.id}')">取消</button>`;
            else if (w.status === 'notified') { const el = Math.round((Date.now() - new Date(w.notifiedAt).getTime()) / 60000); const rem = Math.max(0, (cfg.notifyTimeoutMinutes || 10) - el); acts = `<button class="btn btn-sm btn-success" onclick="App.acceptWaiting('${w.id}')">确认入座</button> <button class="btn btn-sm btn-danger" onclick="App.giveUpWaiting('${w.id}')">放弃</button><br><span style="font-size:11px;color:#ff9800;">${rem}分钟后超时</span>`; }
            else if (w.status === 'seated') acts = '<span style="font-size:12px;color:#4caf50;">✓ 已完成</span>';
            else if (w.status === 'cancelled') acts = '<span style="font-size:12px;color:#999;">已结束</span>';
            const sc = w.status === 'waiting' ? 'reserved' : w.status === 'notified' ? 'notified' : 'available';
            let rd = room ? room.name : '<span style="color:#2196f3;">任意包间</span>'; if (nr) rd = `<span style="color:#e65100;font-weight:600;">${nr.name} (待确认)</span>`;
            return `<tr><td><strong>#${w.globalQueueNumber}</strong></td><td>${w.customerName}</td><td>${w.phone}</td><td>${w.peopleCount}人</td><td>${rd}</td><td>${UI.formatDateTime(w.createdAt)}</td><td><span class="room-status ${sc}">${UI.getStatusLabel(w.status)}</span></td><td>${UI.renderHistoryTimeline(w.history)}</td><td>${acts}</td></tr>`;
        }).join('');
    },
    refreshSmartRecommend() {
        const area = document.getElementById('smartRecommendArea'); const sel = document.getElementById('smartRoomSelect');
        if (!area) return; const rid = sel?.value;
        if (!rid) { area.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">请先在上方选择一个包间</div>'; return; }
        const room = Rooms.getById(rid); if (!room) return;
        const actives = Waiting.getActive(); const now = Date.now();
        const scored = actives.map(w => {
            let score = 0; const reasons = [];
            const waitMin = Math.round((now - new Date(w.createdAt).getTime()) / 60000);
            if (w.preferredRoomId === rid) { score += 100; reasons.push(`期望包间 = ${room.name}`); }
            else if (!w.preferredRoomId) { score += 60; reasons.push('接受任意包间'); }
            else { score += 10; reasons.push(`期望其他包间`); }
            if (w.peopleCount <= room.capacity) {
                const fit = 1 - (w.peopleCount / room.capacity);
                score += (1 - Math.abs(fit - 0.2)) * 40;
                reasons.push(`人数 ${w.peopleCount}/${room.capacity} 合适`);
            } else {
                score -= 200; reasons.push(`⚠ 人数超容量`);
            }
            const waitScore = Math.min(50, waitMin / 3);
            score += waitScore;
            if (waitMin >= 30) reasons.push(`已等 ${waitMin} 分钟（较久）`);
            return { ...w, score, reasons, waitMin };
        });
        scored.sort((a, b) => b.score - a.score);
        if (!scored.length) { area.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">暂无等待中的候补客人</div>'; return; }
        const cfg = Pricing.getConfig();
        area.innerHTML = `<table class="data-table"><thead><tr><th>推荐度</th><th>排队号</th><th>客人</th><th>电话</th><th>人数</th><th>期望</th><th>已等待</th><th>登记时间</th><th>匹配说明</th><th>操作</th></tr></thead><tbody>` + scored.map(w => {
            const lv = w.score >= 120 ? 'high' : w.score >= 80 ? 'medium' : '';
            const pref = w.preferredRoomId ? (Rooms.getById(w.preferredRoomId)?.name || '') : '<span style="color:#2196f3;">任意</span>';
            return `<tr><td><span class="smart-score ${lv}">${Math.max(0, Math.round(w.score))} 分</span></td><td><strong>#${w.globalQueueNumber}</strong></td><td>${w.customerName}</td><td>${w.phone}</td><td>${w.peopleCount}人</td><td>${pref}</td><td>${w.waitMin}分钟</td><td>${UI.formatDateTime(w.createdAt)}</td><td><div class="smart-reason">${w.reasons.join('，')}</div></td><td><button class="btn btn-sm btn-warning" onclick="App.smartNotify('${w.id}','${rid}')">立即通知</button></td></tr>`;
        }).join('') + `</tbody></table>`;
    },
    smartNotify(wid, rid) { const res = Waiting.manualNotify(wid, rid); if (res.success) { const e = Waiting.getAll().find(w => w.id === wid); const r = Rooms.getById(rid); this.toast(`已智能通知 #${e?.globalQueueNumber} ${e?.customerName} 入住 ${r?.name}`, 'success'); this.refreshAll(); } else { this.toast(res.reason, 'error'); } },
    switchBillView() { const v = document.getElementById('billViewSwitch')?.value || 'list'; const lv = document.getElementById('billListView'); const sv = document.getElementById('billShiftView'); if (lv) lv.style.display = v === 'list' ? '' : 'none'; if (sv) sv.style.display = v === 'shift' ? '' : 'none'; if (v === 'shift') this.renderShiftSummary(); },
    renderShiftSummary() {
        const tbody = document.querySelector('#shiftSummaryTable tbody'); if (!tbody) return;
        let bills = Bills.getAll(); const df = document.getElementById('billDateFilter')?.value;
        if (df) bills = bills.filter(b => new Date(b.createdAt).toISOString().split('T')[0] === df);
        const groups = {};
        for (const b of bills) {
            const d = new Date(b.createdAt); const dateStr = d.toISOString().split('T')[0]; const shift = Waiting.getShiftTag(d.getHours());
            const key = `${dateStr}|${shift.key}`; if (!groups[key]) groups[key] = { date: dateStr, shiftKey: shift.key, shiftLabel: shift.label, count: 0, roomFee: 0, addons: 0, total: 0, billIds: [] };
            groups[key].count++; groups[key].roomFee += b.roomFee; groups[key].addons += b.addonsTotal; groups[key].total += b.total; groups[key].billIds.push(b.id);
        }
        const arr = Object.values(groups).sort((a, b) => b.date.localeCompare(a.date) || ['morning','afternoon','night','late-night'].indexOf(a.shiftKey) - ['morning','afternoon','night','late-night'].indexOf(b.shiftKey));
        this._shiftSummaries = arr;
        if (!arr.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state">暂无汇总数据</td></tr>'; return; }
        tbody.innerHTML = arr.map((g, idx) => `<tr><td>${g.date}</td><td><span class="shift-tag ${g.shiftKey}">${g.shiftLabel}</span></td><td><strong>${g.count}</strong></td><td>${UI.formatMoney(g.roomFee)}</td><td>${UI.formatMoney(g.addons)}</td><td><strong style="color:#e91e63;font-size:15px;">${UI.formatMoney(g.total)}</strong></td><td><button class="btn btn-sm btn-secondary" onclick="App.showShiftDetail(${idx})">查看明细</button></td></tr>`).join('');
    },
    showShiftDetail(idx) {
        const g = this._shiftSummaries[idx]; if (!g) return;
        const billIds = g.billIds;
        const bills = billIds.map(id => Bills.getById(id)).filter(Boolean); if (!bills.length) return;
        const rows = bills.map(b => `<tr onclick="App.closeModal();App.showBillDetailModal('${b.id}')" style="cursor:pointer;"><td><strong>${b.id}</strong></td><td>${b.roomName}</td><td>${b.customerName}</td><td>${UI.formatDateTime(b.endTime)}</td><td>${UI.formatDuration(b.durationMinutes)}</td><td>${UI.formatMoney(b.roomFee)}</td><td>${UI.formatMoney(b.addonsTotal)}</td><td><strong>${UI.formatMoney(b.total)}</strong></td></tr>`).join('');
        const totR = bills.reduce((s, b) => s + b.roomFee, 0); const totA = bills.reduce((s, b) => s + b.addonsTotal, 0); const totT = bills.reduce((s, b) => s + b.total, 0);
        this.openModal(`<div class="modal-header"><h3>交接班账单明细（共 ${bills.length} 笔）</h3><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="modal-body" style="max-height:60vh;overflow:auto;"><table class="data-table" style="width:100%;font-size:13px;"><thead><tr><th>账单号</th><th>包间</th><th>客人</th><th>结账时间</th><th>时长</th><th>台费</th><th>加购</th><th>合计</th></tr></thead><tbody>${rows}</tbody></table></div><div class="modal-body" style="padding-top:0;"><div class="breakdown-total"><span>台费合计</span><span>${UI.formatMoney(totR)}</span></div><div class="breakdown-total" style="border:none;margin-top:0;"><span>加购合计</span><span>${UI.formatMoney(totA)}</span></div><div class="breakdown-total" style="margin-top:8px;"><span>总收入</span><span style="color:#e91e63;font-size:18px;">${UI.formatMoney(totT)}</span></div></div><div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">关闭</button></div>`);
    },
    openModal(html) { document.getElementById('modalContent').innerHTML = html; document.getElementById('modalContainer').classList.add('active'); },
    closeModal() { document.getElementById('modalContainer').classList.remove('active'); },
    toast(msg, type = 'success') { const el = document.getElementById('toast'); el.textContent = msg; el.className = 'toast active ' + type; setTimeout(() => { el.className = 'toast'; }, 3000); },
    showCheckinModal(preselectedRoomId) {
        const rooms = Rooms.getAvailable(); if (!rooms.length) { this.toast('暂无可使用的包间', 'error'); return; }
        const opts = rooms.map(r => `<option value="${r.id}" ${r.id === preselectedRoomId ? 'selected' : ''}>${r.code} ${r.name} (${r.capacity}人)</option>`).join('');
        this.openModal(`<div class="modal-header"><h3>开台登记</h3><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="modal-body"><div class="form-row"><label>选择包间 *</label><select id="ciRoom" class="form-input">${opts}</select></div><div class="form-row"><label>客人姓名 *</label><input type="text" id="ciName" class="form-input" placeholder="请输入客人姓名"></div><div class="form-row"><label>联系电话 *</label><input type="text" id="ciPhone" class="form-input" placeholder="请输入联系电话"></div><div class="form-row"><label>人数 *</label><input type="number" id="ciPeople" class="form-input" min="1" value="4"></div><div class="form-row"><label><input type="checkbox" id="ciReserve" onchange="App.toggleReserveTime()"> 仅预订（暂不开台）</label></div><div id="reserveHint" style="display:none;" class="form-hint">预订后 ${Pricing.getConfig().releaseMinutes} 分钟未到将自动释放</div></div><div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="App.submitCheckin()">确认开台</button></div>`);
    },
    toggleReserveTime() { const h = document.getElementById('reserveHint'); if (h) h.style.display = document.getElementById('ciReserve').checked ? 'block' : 'none'; },
    submitCheckin() { const rid = document.getElementById('ciRoom').value; const n = document.getElementById('ciName').value.trim(); const p = document.getElementById('ciPhone').value.trim(); const pc = parseInt(document.getElementById('ciPeople').value); const ro = document.getElementById('ciReserve').checked; if (!rid || !n || !p || !pc) { this.toast('请填写完整信息', 'error'); return; } Orders.create({ roomId: rid, customerName: n, phone: p, peopleCount: pc, reserveOnly: ro }); this.toast(ro ? '预订成功' : '开台成功', 'success'); this.closeModal(); this.refreshAll(); },
    showRoomModal(roomId) {
        const room = roomId ? Rooms.getById(roomId) : null;
        this.openModal(`<div class="modal-header"><h3>${room ? '编辑包间' : '新增包间'}</h3><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="modal-body"><div class="form-row"><label>包间编号 *</label><input type="text" id="rmCode" class="form-input" value="${room?.code || ''}" placeholder="如：A101"></div><div class="form-row"><label>包间名称 *</label><input type="text" id="rmName" class="form-input" value="${room?.name || ''}" placeholder="如：豪华大包"></div><div class="form-row"><label>容纳人数 *</label><input type="number" id="rmCapacity" class="form-input" min="1" value="${room?.capacity || 4}"></div><div class="form-row"><label>基础设置</label><input type="text" id="rmAmenities" class="form-input" value="${room?.amenities || ''}" placeholder="如：空调、沙发、茶台"></div><input type="hidden" id="rmId" value="${room?.id || ''}"></div><div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="App.submitRoom()">保存</button></div>`);
    },
    submitRoom() { const id = document.getElementById('rmId').value; const c = document.getElementById('rmCode').value.trim(); const n = document.getElementById('rmName').value.trim(); const cap = parseInt(document.getElementById('rmCapacity').value); const am = document.getElementById('rmAmenities').value.trim(); if (!c || !n || !cap) { this.toast('请填写完整信息', 'error'); return; } Rooms.save({ id: id || undefined, code: c, name: n, capacity: cap, amenities: am }); this.toast('保存成功', 'success'); this.closeModal(); this.refreshAll(); },
    deleteRoom(id) { const r = Rooms.getById(id); if (!r) return; if (r.status !== 'available') { this.toast('该包间正在使用/预订/候补中，无法删除', 'error'); return; } if (!confirm('确定删除包间「' + r.name + '」？')) return; Rooms.delete(id); this.toast('删除成功', 'success'); this.refreshAll(); },
    showTimeSlotModal(slotId) {
        const slot = slotId ? Pricing.getTimeSlots().find(s => s.id === slotId) : null;
        const isMid = slot && (slot.endTime === '24:00' || (slot.endTime === '00:00' && slot.startTime !== '00:00'));
        const det = isMid ? '23:59' : (slot?.endTime || '00:00');
        this.openModal(`<div class="modal-header"><h3>${slot ? '编辑时段' : '新增时段'}</h3><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="modal-body"><div class="form-row"><label>时段名称 *</label><input type="text" id="tsName" class="form-input" value="${slot?.name || ''}" placeholder="如：晚间高峰"></div><div class="form-row"><label>开始时间 *</label><input type="time" id="tsStart" class="form-input" value="${slot?.startTime || '00:00'}"></div><div class="form-row"><label>结束时间 *</label><input type="time" id="tsEnd" class="form-input" value="${det}"><label style="margin-top:6px;display:flex;align-items:center;gap:6px;font-size:13px;color:#555;"><input type="checkbox" id="tsEndMidnight" ${isMid ? 'checked' : ''} onchange="App.toggleEndTimeInput()"> 到当日 24:00</label></div><div class="form-row"><label>费率类型 *</label><select id="tsType" class="form-input"><option value="peak" ${slot?.type === 'peak' ? 'selected' : ''}>高峰</option><option value="normal" ${slot?.type === 'normal' ? 'selected' : ''}>平峰</option><option value="valley" ${slot?.type === 'valley' ? 'selected' : ''}>低谷</option></select></div><div class="form-row"><label>单价(元/小时) *</label><input type="number" id="tsPrice" class="form-input" min="0" step="0.01" value="${slot?.price || 30}"></div><input type="hidden" id="tsId" value="${slot?.id || ''}"></div><div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="App.submitTimeSlot()">保存</button></div>`);
    },
    toggleEndTimeInput() { const cb = document.getElementById('tsEndMidnight'); const inp = document.getElementById('tsEnd'); if (cb && inp) { inp.disabled = cb.checked; if (cb.checked) { inp.value = '23:59'; inp.style.opacity = '0.5'; } else { inp.style.opacity = '1'; } } },
    submitTimeSlot() { const id = document.getElementById('tsId').value; const n = document.getElementById('tsName').value.trim(); const st = document.getElementById('tsStart').value; const mid = document.getElementById('tsEndMidnight')?.checked; let en = mid ? '24:00' : document.getElementById('tsEnd').value; const tp = document.getElementById('tsType').value; const pr = parseFloat(document.getElementById('tsPrice').value); if (!n || !st || !en || !pr) { this.toast('请填写完整信息', 'error'); return; } Pricing.saveTimeSlot({ id: id || undefined, name: n, startTime: st, endTime: en, type: tp, price: pr }); this.toast('保存成功', 'success'); this.closeModal(); this.refreshAll(); },
    deleteTimeSlot(id) { if (!confirm('确定删除该时段？')) return; Pricing.deleteTimeSlot(id); this.toast('删除成功', 'success'); this.refreshAll(); },
    showAddonModal(addonId) {
        const a = addonId ? Pricing.getAddons().find(x => x.id === addonId) : null;
        this.openModal(`<div class="modal-header"><h3>${a ? '编辑加购项目' : '新增加购项目'}</h3><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="modal-body"><div class="form-row"><label>项目名称 *</label><input type="text" id="adName" class="form-input" value="${a?.name || ''}" placeholder="如：铁观音"></div><div class="form-row"><label>分类 *</label><select id="adCategory" class="form-input"><option value="茶水" ${a?.category === '茶水' ? 'selected' : ''}>茶水</option><option value="饮品" ${a?.category === '饮品' ? 'selected' : ''}>饮品</option><option value="零食" ${a?.category === '零食' ? 'selected' : ''}>零食</option><option value="其他" ${a?.category === '其他' ? 'selected' : ''}>其他</option></select></div><div class="form-row"><label>单价(元) *</label><input type="number" id="adPrice" class="form-input" min="0" step="0.01" value="${a?.price || 0}"></div><input type="hidden" id="adId" value="${a?.id || ''}"></div><div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="App.submitAddon()">保存</button></div>`);
    },
    submitAddon() { const id = document.getElementById('adId').value; const n = document.getElementById('adName').value.trim(); const c = document.getElementById('adCategory').value; const p = parseFloat(document.getElementById('adPrice').value); if (!n || !p) { this.toast('请填写完整信息', 'error'); return; } Pricing.saveAddon({ id: id || undefined, name: n, category: c, price: p }); this.toast('保存成功', 'success'); this.closeModal(); this.refreshAll(); },
    deleteAddon(id) { if (!confirm('确定删除该加购项目？')) return; Pricing.deleteAddon(id); this.toast('删除成功', 'success'); this.refreshAll(); },
    saveReleaseConfig() { const m = parseInt(document.getElementById('releaseMinutes').value); const nm = parseInt(document.getElementById('notifyTimeoutMinutes').value); if (!m || m < 5 || m > 120) { this.toast('预订超时请输入5-120之间的数值', 'error'); return; } if (!nm || nm < 5 || nm > 60) { this.toast('通知超时请输入5-60之间的数值', 'error'); return; } Pricing.saveConfig({ releaseMinutes: m, notifyTimeoutMinutes: nm }); this.toast('保存成功', 'success'); },
    showOrderDetailModal(oid) {
        const o = Orders.getAll().find(x => x.id === oid); if (!o) return; const r = Rooms.getById(o.roomId); const now = new Date().toISOString(); const m = Math.round((new Date(now) - new Date(o.startTime)) / 60000); const fee = Pricing.calculateRoomFee(o.startTime, now);
        const segH = fee.segments.map(s => `<div class="breakdown-item"><span>${s.slotName} <span class="tag ${UI.getRateTypeClass(s.slotType)}">${UI.getRateTypeLabel(s.slotType)}</span> (${s.durationHours}小时×¥${s.pricePerHour})</span><span>${UI.formatMoney(s.cost)}</span></div>`).join('');
        const addH = o.addons.length ? o.addons.map(a => `<div class="breakdown-item"><span>${a.name} × ${a.quantity}</span><span>${UI.formatMoney(a.subtotal)}</span></div>`).join('') : '<div class="breakdown-item"><span style="color:#999;">暂无加购</span><span>-</span></div>';
        const at = o.addons.reduce((s, a) => s + a.subtotal, 0); const t = fee.total + at;
        this.openModal(`<div class="modal-header"><h3>${r?.code} ${r?.name} - 订单详情</h3><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="modal-body"><div class="form-row"><label>客人：${o.customerName} (${o.phone})，${o.peopleCount}人</label></div><div class="form-row"><label>开始时间：${UI.formatDateTime(o.startTime)}</label></div><div class="form-row"><label>已用时长：${UI.formatDuration(m)}</label></div><div class="billing-breakdown"><div style="font-weight:600;margin-bottom:8px;">台费明细（跨时段分段计费）</div>${segH}<div class="breakdown-total"><span>台费小计</span><span>${UI.formatMoney(fee.total)}</span></div></div><div class="billing-breakdown"><div style="font-weight:600;margin-bottom:8px;">加购项目</div>${addH}<div class="breakdown-total"><span>加购小计</span><span>${UI.formatMoney(at)}</span></div></div><div class="breakdown-total" style="margin-top:12px;"><span>当前合计</span><span style="color:#e91e63;">${UI.formatMoney(t)}</span></div></div><div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">关闭</button><button class="btn btn-warning" onclick="App.showAddonModalForOrder('${o.id}')">加购</button><button class="btn btn-primary" onclick="App.showCheckoutModal('${o.id}')">结账</button></div>`);
    },
    showReservedModal(oid) {
        const o = Orders.getAll().find(x => x.id === oid); if (!o) return; const r = Rooms.getById(o.roomId);
        this.openModal(`<div class="modal-header"><h3>预订确认 - ${r?.name}</h3><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="modal-body"><p>客人：${o.customerName} (${o.phone})</p><p>人数：${o.peopleCount}人</p><p>预订时间：${UI.formatDateTime(o.reservedAt)}</p><p style="color:#ff9800;">注意：${Pricing.getConfig().releaseMinutes}分钟内未到将自动释放</p></div><div class="modal-footer"><button class="btn btn-danger" onclick="App.cancelOrder('${o.id}')">取消预订</button><button class="btn btn-primary" onclick="App.checkinOrder('${o.id}')">确认入座</button></div>`);
    },
    showNotifiedDetailModal(rid, wid) {
        const room = Rooms.getById(rid); const e = Waiting.getAll().find(w => w.id === wid); if (!room || !e) return;
        const cfg = Pricing.getConfig(); const el = Math.round((Date.now() - new Date(e.notifiedAt).getTime()) / 60000); const rem = Math.max(0, (cfg.notifyTimeoutMinutes || 10) - el);
        this.openModal(`<div class="modal-header"><h3>候补占位详情 - ${room.code} ${room.name}</h3><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="modal-body"><div class="form-row"><label>客人姓名：${e.customerName}</label></div><div class="form-row"><label>联系电话：${e.phone}</label></div><div class="form-row"><label>排队号：#${e.globalQueueNumber}</label></div><div class="form-row"><label>人数：${e.peopleCount}人</label></div><div class="form-row"><label>通知时间：${UI.formatDateTime(e.notifiedAt)}</label></div><div class="form-row"><label style="color:#ff9800;">超时倒计时：${rem} 分钟后自动释放</label></div><div class="billing-breakdown"><div style="font-weight:600;margin-bottom:8px;">操作记录</div>${UI.renderHistoryTimeline(e.history)}</div></div><div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">关闭</button><button class="btn btn-danger" onclick="App.giveUpWaiting('${e.id}')">放弃</button><button class="btn btn-primary" onclick="App.acceptWaiting('${e.id}')">确认入座</button></div>`);
    },
    showManualNotifyModal() {
        const guests = Waiting.getActive().sort((a, b) => a.globalQueueNumber - b.globalQueueNumber); const rooms = Rooms.getAvailable();
        if (!guests.length) { this.toast('当前没有等待中的候补客人', 'warning'); return; }
        if (!rooms.length) { this.toast('当前没有空闲的包间', 'warning'); return; }
        const gOpts = guests.map(w => { const pref = w.preferredRoomId ? ` (期望：${Rooms.getById(w.preferredRoomId)?.name || '任意'})` : ''; return `<option value="${w.id}">#${w.globalQueueNumber} ${w.customerName} ${w.peopleCount}人${pref}</option>`; }).join('');
        const rOpts = rooms.map(r => `<option value="${r.id}">${r.code} ${r.name} (${r.capacity}人)</option>`).join('');
        this.openModal(`<div class="modal-header"><h3>手动通知候补客人</h3><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="modal-body"><div class="form-row"><label>选择候补客人 *</label><select id="mnGuest" class="form-input">${gOpts}</select></div><div class="form-row"><label>选择包间 *</label><select id="mnRoom" class="form-input">${rOpts}</select></div></div><div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="App.submitManualNotify()">确认通知</button></div>`);
    },
    showManualNotifyForWaiting(wid) {
        const e = Waiting.getAll().find(w => w.id === wid); if (!e) return;
        const rooms = Rooms.getAvailable(); if (!rooms.length) { this.toast('当前没有空闲的包间可通知', 'warning'); return; }
        const matched = rooms.filter(r => r.capacity >= e.peopleCount);
        const rOpts = (matched.length ? matched : rooms).map(r => `<option value="${r.id}">${r.code} ${r.name} (${r.capacity}人)${r.capacity >= e.peopleCount ? '' : ' ⚠人数不足'}</option>`).join('');
        this.openModal(`<div class="modal-header"><h3>通知 #${e.globalQueueNumber} ${e.customerName}</h3><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="modal-body"><div class="form-row"><label>客人：${e.customerName}，${e.peopleCount}人</label></div><div class="form-row"><label>选择包间 *</label><select id="mnRoom" class="form-input">${rOpts}</select></div><input type="hidden" id="mnGuest" value="${e.id}"></div><div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="App.submitManualNotify()">确认通知</button></div>`);
    },
    submitManualNotify() { const wid = document.getElementById('mnGuest').value; const rid = document.getElementById('mnRoom').value; if (!wid || !rid) { this.toast('请选择客人和包间', 'error'); return; } const res = Waiting.manualNotify(wid, rid); if (res.success) { const e = Waiting.getAll().find(w => w.id === wid); const r = Rooms.getById(rid); this.toast(`已通知 #${e?.globalQueueNumber} ${e?.customerName} 入住 ${r?.name}`, 'success'); this.closeModal(); this.refreshAll(); } else { this.toast(res.reason, 'error'); } },
    checkinOrder(oid) { Orders.checkin(oid); this.toast('已确认入座，开始计时', 'success'); this.closeModal(); this.refreshAll(); },
    cancelOrder(oid) { if (!confirm('确定取消该订单？')) return; Orders.cancel(oid); this.toast('订单已取消', 'success'); this.closeModal(); this.refreshAll(); },
    cancelWaiting(id) { if (!confirm('确定取消该候补？')) return; Waiting.cancelWaiting(id); this.toast('已取消候补', 'success'); this.refreshAll(); },
    giveUpWaiting(id) { if (!confirm('确定放弃该候补占位？')) return; Waiting.giveUpNotified(id); this.toast('已放弃，包间已释放', 'success'); this.closeModal(); this.refreshAll(); },
    acceptWaiting(wid) { const res = Waiting.acceptWaiting(wid); if (res.success) { this.toast('候补客人已入座，开始计时', 'success'); this.closeModal(); this.refreshAll(); } else { this.toast(res.reason || '操作失败', 'error'); this.refreshAll(); } },
    showAddonModalForOrder(oid) {
        const o = Orders.getAll().find(x => x.id === oid); if (!o) return; const addons = Pricing.getAddons(); this.tempAddons = {};
        const items = addons.map(a => { const ex = o.addons.find(x => x.addonId === a.id); const q = ex ? ex.quantity : 0; if (q) this.tempAddons[a.id] = q; return `<div class="addon-item ${q ? 'selected' : ''}" data-addon-id="${a.id}"><div><div style="font-weight:500;">${a.name}</div><div style="font-size:12px;color:#999;">${a.category} · ¥${a.price}</div></div><div class="addon-qty"><button onclick="App.adjustAddonQty('${a.id}', -1)">-</button><span id="qty-${a.id}">${q}</span><button onclick="App.adjustAddonQty('${a.id}', 1)">+</button></div></div>`; }).join('');
        this.openModal(`<div class="modal-header"><h3>加购项目</h3><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="modal-body"><div class="addon-list">${items}</div></div><div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="App.submitAddonsForOrder('${oid}')">确认加购</button></div>`);
    },
    adjustAddonQty(aid, delta) { const n = Math.max(0, (this.tempAddons[aid] || 0) + delta); this.tempAddons[aid] = n; const qe = document.getElementById('qty-' + aid); if (qe) qe.textContent = n; const ie = document.querySelector('[data-addon-id="' + aid + '"]'); if (ie) ie.classList.toggle('selected', n > 0); },
    submitAddonsForOrder(oid) { const o = Orders.getAll().find(x => x.id === oid); if (!o) return; for (const a of o.addons) Orders.removeAddon(oid, a.addonId); for (const [aid, qty] of Object.entries(this.tempAddons)) { if (qty > 0) Orders.addAddon(oid, aid, qty); } this.toast('加购已更新', 'success'); this.closeModal(); this.refreshAll(); },
    showCheckoutModal(oid) {
        const o = Orders.getAll().find(x => x.id === oid); if (!o) return; const r = Rooms.getById(o.roomId); const en = new Date().toISOString(); const m = Math.round((new Date(en) - new Date(o.startTime)) / 60000); const fee = Pricing.calculateRoomFee(o.startTime, en);
        const segH = fee.segments.map(s => `<div class="breakdown-item"><span>${s.slotName} <span class="tag ${UI.getRateTypeClass(s.slotType)}">${UI.getRateTypeLabel(s.slotType)}</span> (${s.durationHours}小时×¥${s.pricePerHour})</span><span>${UI.formatMoney(s.cost)}</span></div>`).join('');
        const addH = o.addons.length ? o.addons.map(a => `<div class="breakdown-item"><span>${a.name} × ${a.quantity}</span><span>${UI.formatMoney(a.subtotal)}</span></div>`).join('') : '<div class="breakdown-item"><span style="color:#999;">暂无加购</span><span>-</span></div>';
        const at = o.addons.reduce((s, a) => s + a.subtotal, 0); const t = fee.total + at;
        this.openModal(`<div class="modal-header"><h3>结账确认 - ${r?.name}</h3><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="modal-body"><div class="form-row"><label>客人：${o.customerName} (${o.phone})，${o.peopleCount}人</label></div><div class="form-row"><label>消费时长：${UI.formatDuration(m)} (${UI.formatDateTime(o.startTime)} ~ ${UI.formatDateTime(en)})</label></div><div class="billing-breakdown"><div style="font-weight:600;margin-bottom:8px;">台费明细（跨时段分段计费）</div>${segH}<div class="breakdown-total"><span>台费小计</span><span>${UI.formatMoney(fee.total)}</span></div></div><div class="billing-breakdown"><div style="font-weight:600;margin-bottom:8px;">加购项目</div>${addH}<div class="breakdown-total"><span>加购小计</span><span>${UI.formatMoney(at)}</span></div></div><div class="breakdown-total" style="margin-top:12px;"><span>应收合计</span><span style="color:#e91e63;font-size:20px;">${UI.formatMoney(t)}</span></div></div><div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="App.confirmCheckout('${oid}')">确认结账</button></div>`);
    },
    confirmCheckout(oid) { const bill = Orders.checkout(oid); if (bill) { this.toast(`结账成功，应收 ${UI.formatMoney(bill.total)}`, 'success'); this.closeModal(); this.refreshAll(); setTimeout(() => this.showBillDetailModal(bill.id), 300); } },
    showBillDetailModal(bid) {
        const b = Bills.getById(bid); if (!b) return;
        const segH = b.segments.map(s => `<div class="breakdown-item"><span>${s.slotName} <span class="tag ${UI.getRateTypeClass(s.slotType)}">${UI.getRateTypeLabel(s.slotType)}</span> (${s.durationHours}小时×¥${s.pricePerHour})</span><span>${UI.formatMoney(s.cost)}</span></div>`).join('');
        const addH = b.addons.length ? b.addons.map(a => `<div class="breakdown-item"><span>${a.name} × ${a.quantity}</span><span>${UI.formatMoney(a.subtotal)}</span></div>`).join('') : '<div class="breakdown-item"><span style="color:#999;">暂无加购</span><span>-</span></div>';
        this.openModal(`<div class="modal-header"><h3>账单详情 - ${b.id}</h3><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="modal-body"><div class="form-row"><label>包间：${b.roomName}</label></div><div class="form-row"><label>客人：${b.customerName} (${b.phone})，${b.peopleCount}人</label></div><div class="form-row"><label>消费时长：${UI.formatDuration(b.durationMinutes)}</label></div><div class="form-row"><label>时段：${UI.formatDateTime(b.startTime)} ~ ${UI.formatDateTime(b.endTime)}</label></div><div class="billing-breakdown"><div style="font-weight:600;margin-bottom:8px;">台费明细</div>${segH}<div class="breakdown-total"><span>台费小计</span><span>${UI.formatMoney(b.roomFee)}</span></div></div><div class="billing-breakdown"><div style="font-weight:600;margin-bottom:8px;">加购项目</div>${addH}<div class="breakdown-total"><span>加购小计</span><span>${UI.formatMoney(b.addonsTotal)}</span></div></div><div class="breakdown-total" style="margin-top:12px;"><span>应收合计</span><span style="color:#e91e63;font-size:20px;">${UI.formatMoney(b.total)}</span></div></div><div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">关闭</button></div>`);
    },
    showWaitingModal() {
        const rooms = Rooms.getAll();
        const rOpts = '<option value="">任意包间</option>' + rooms.map(r => `<option value="${r.id}">${r.code} ${r.name} (${r.capacity}人)</option>`).join('');
        this.openModal(`<div class="modal-header"><h3>登记候补</h3><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="modal-body"><div class="form-row"><label>客人姓名 *</label><input type="text" id="wtName" class="form-input" placeholder="请输入客人姓名"></div><div class="form-row"><label>联系电话 *</label><input type="text" id="wtPhone" class="form-input" placeholder="请输入联系电话"></div><div class="form-row"><label>人数 *</label><input type="number" id="wtPeople" class="form-input" min="1" value="4"></div><div class="form-row"><label>期望包间</label><select id="wtRoom" class="form-input">${rOpts}</select></div></div><div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="App.submitWaiting()">确认登记</button></div>`);
    },
    submitWaiting() {
        const n = document.getElementById('wtName').value.trim();
        const p = document.getElementById('wtPhone').value.trim();
        const pc = parseInt(document.getElementById('wtPeople').value);
        const rid = document.getElementById('wtRoom').value || null;
        if (!n || !p || !pc) { this.toast('请填写完整信息', 'error'); return; }
        const entry = Waiting.add({ customerName: n, phone: p, peopleCount: pc, preferredRoomId: rid });
        this.toast(`候补登记成功，排队号 #${entry.globalQueueNumber}`, 'success');
        this.closeModal();
        this.refreshAll();
    }
};

document.addEventListener('DOMContentLoaded', () => { App.init(); });