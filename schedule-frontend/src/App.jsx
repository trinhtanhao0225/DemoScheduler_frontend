import React, { useState } from 'react';
import axios from 'axios';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

import SettingsTab from './SettingTab';

const API_URL = 'https://demo-scheduler-1.onrender.com';

const fakeData = {
  employees: [
    { id: "N1", name: "Alice Nguyen", role: "Nurse", is_senior: true, weekly_max_hours: 40 },
    { id: "N2", name: "Bob Tran", role: "Nurse", is_senior: true, weekly_max_hours: 40 },
    { id: "N3", name: "Catherine Le", role: "Nurse", is_senior: true, weekly_max_hours: 40 },
    { id: "N4", name: "Diana Pham", role: "Nurse", is_senior: false, weekly_max_hours: 40 },
    { id: "C1", name: "Grace Vu", role: "Caregiver", is_senior: true, weekly_max_hours: 40 },
    { id: "C2", name: "Henry Vo", role: "Caregiver", is_senior: false, weekly_max_hours: 40 },
    { id: "C3", name: "Ivan Dang", role: "Caregiver", is_senior: false, weekly_max_hours: 40 },
    { id: "C4", name: "Jenny Phan", role: "Caregiver", is_senior: false, weekly_max_hours: 40 }
  ],
  num_days: 7,
  min_staff: { M: 2, E: 2, N: 1 }
};

// ================= COMPONENTS =================
function EmployeeItem({ emp, isOverlay = false }) {
  const { attributes, listeners, setNodeRef, transform } = useSortable({
    id: emp.id,
    data: { employee: emp }
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...attributes}
      {...listeners}
      className={`p-3 rounded-xl border bg-white shadow-sm cursor-grab active:cursor-grabbing transition-all min-w-[160px]
        ${isOverlay ? 'border-blue-600 shadow-xl scale-105 z-50' : 'border-slate-200 hover:border-blue-300 hover:shadow-md'}`}
    >
      <div className="flex items-center justify-between">
        <p className="font-bold text-sm text-slate-700">
          {emp.is_senior && "⭐ "}{emp.name}
        </p>
        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
          {emp.weekly_max_hours}h
        </span>
      </div>
      <p className="text-xs text-slate-400 mt-0.5 uppercase tracking-tighter font-semibold">{emp.role}</p>
    </div>
  );
}

function ShiftSlot({ dayIdx, shift, assigned, onRemove }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${dayIdx}-${shift}`,
    data: { dayIdx, shift }
  });

  const shiftNames = { M: "07:00 - 15:00", E: "15:00 - 23:00", N: "23:00 - 07:00" };

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[140px] p-3 rounded-xl border-2 transition-all flex flex-col gap-2
        ${isOver ? 'bg-blue-50 border-blue-400 border-solid' : 'bg-slate-50/50 border-slate-100 border-dashed'}`}
    >
      <p className="uppercase text-[10px] font-black text-slate-400 tracking-widest">{shiftNames[shift]}</p>
      <div className="flex flex-col gap-1.5">
        {assigned.map((e) => (
          <div
            key={e.id}
            className="bg-white border border-slate-200 p-2 rounded-lg flex justify-between items-center group shadow-sm"
          >
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="font-semibold text-[11px] text-slate-700 truncate">{e.name}</span>
              {e.is_senior && <span className="text-[10px]">⭐</span>}
            </div>
            <button
              onClick={() => onRemove(dayIdx, shift, e.id)}
              className="text-rose-400 hover:text-rose-600 transition-colors ml-1 px-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ================= MAIN APP =================
export default function App() {
  const [schedule, setSchedule] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeDrag, setActiveDrag] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState("schedule");

  const [constraints, setConstraints] = useState({
    fixed_assignments: [],
    days_off: []
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // 1. RANDOM DRAFT
  const fetchSchedule = async () => {
    setLoading(true);
    setWarnings([]);
    try {
      const res = await axios.post(`${API_URL}/generate-schedule`, {
        ...fakeData,
        manual_schedule: null,
        constraints: null,
        use_constraints: false
      });

      if (res.data.status === "success") {
        setSchedule(res.data.schedule);
        setWarnings(res.data.statistics?.shortage_details || []);
        setHasUnsavedChanges(true);
      }
    } catch (err) {
      alert("Random Draft Failed! Server may be sleeping.");
    } finally {
      setLoading(false);
    }
  };

  // 2. APPLY CONSTRAINTS
  const handleGenerateByConstraints = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/generate-schedule`, {
        ...fakeData,
        manual_schedule: null,
        constraints: constraints,
        use_constraints: true
      });

      if (res.data.status === "success") {
        setSchedule(res.data.schedule);
        setWarnings(res.data.statistics?.shortage_details || []);
        setHasUnsavedChanges(true);
        alert("Schedule updated with your constraints!");
      } else {
        alert("No feasible solution for these constraints!");
      }
    } catch (err) {
      alert("System Error: Check logic in Rule Builder.");
    } finally {
      setLoading(false);
    }
  };

  // 3. VALIDATE & SYNC - ĐÃ SỬA ĐỂ XỬ LÝ TỐT HƠN
  const handleSaveSchedule = async () => {
    if (!schedule) return;

    setLoading(true);
    setWarnings([]);

    try {
      const payload = {
        ...fakeData,
        manual_schedule: schedule,
        constraints: constraints,
        use_constraints: true
      };

      const res = await axios.post(`${API_URL}/generate-schedule`, payload, {
        timeout: 45000, // Tăng timeout lên 45 giây vì validate thường chậm hơn
      });

      const data = res.data;

      if (data.status === "error") {
        alert("Lỗi server: " + (data.message || "Unknown error"));
        return;
      }

      // Lấy thông tin vi phạm
      const violations = data.violations || [];
      const shortages = data.shortages || data.statistics?.shortage_details || [];

      if (violations.length > 0 || shortages.length > 0) {
        const allWarnings = [...violations, ...shortages];
        setWarnings(allWarnings);

        let message = "❌ Không thể đồng bộ lịch!\n\n";

        if (violations.length > 0) {
          message += "VI PHẠM QUY TẮC CỨNG:\n";
          violations.forEach(v => message += `• ${v}\n`);
          message += "\n";
        }
        if (shortages.length > 0) {
          message += "THIẾU NHÂN SỰ:\n";
          shortages.forEach(s => message += `• ${s}\n`);
        }

        alert(message);
        return;
      }

      // Thành công
      setSchedule(data.schedule || schedule);
      setWarnings([]);
      setHasUnsavedChanges(false);
      alert("✅ Lịch đã được đồng bộ thành công!");

    } catch (err) {
      console.error("Validate Error:", err);

      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        alert("⏳ Server đang khởi động lại (Render Free).\n\nVui lòng chờ khoảng 20-30 giây rồi bấm nút Validate & Sync lần nữa.");
      } else if (err.response) {
        alert(`Lỗi từ server: ${err.response.status} - ${err.response.data?.message || 'Unknown'}`);
      } else {
        alert("Lỗi kết nối server.\nServer có thể đang ngủ. Vui lòng thử lại sau 20 giây.");
      }
    } finally {
      setLoading(false);
    }
  };

  const onDragEnd = (event) => {
    const { active, over } = event;
    setActiveDrag(null);
    if (!over || !schedule) return;

    const emp = active.data.current.employee;
    const { dayIdx, shift } = over.data.current;

    const next = JSON.parse(JSON.stringify(schedule));

    ["M", "E", "N"].forEach((s) => {
      next[String(dayIdx)][s] = next[String(dayIdx)][s].filter((x) => x.id !== emp.id);
    });

    next[String(dayIdx)][shift].push({
      id: emp.id,
      name: emp.name,
      role: emp.role,
      is_senior: emp.is_senior,
    });

    setSchedule(next);
    setHasUnsavedChanges(true);
  };

  const handleRemove = (dayIdx, shift, empId) => {
    const next = JSON.parse(JSON.stringify(schedule));
    next[dayIdx][shift] = next[dayIdx][shift].filter((x) => x.id !== empId);
    setSchedule(next);
    setHasUnsavedChanges(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-8 font-sans antialiased text-slate-900">
      <div className="max-w-[1800px] mx-auto">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">AI STAFF SCHEDULER</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Medical Center Management System</p>
          </div>

          <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
            <button 
              onClick={() => setActiveTab("schedule")} 
              className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === "schedule" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}
            >
              Board View
            </button>
            <button 
              onClick={() => setActiveTab("settings")} 
              className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === "settings" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}
            >
              Rule Builder
            </button>
          </div>
        </header>

        {/* ACTION BAR */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${hasUnsavedChanges ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
            <span className="text-sm font-bold text-slate-600">
              {hasUnsavedChanges ? "Pending Changes" : "System Synchronized"}
            </span>
          </div>

          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            <button 
              onClick={fetchSchedule} 
              disabled={loading} 
              className="px-4 py-2.5 rounded-xl font-bold text-sm bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-all"
            >
              Random Draft
            </button>

            <button 
              onClick={handleGenerateByConstraints} 
              disabled={loading} 
              className="px-4 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
              ✨ {loading ? "Optimizing..." : "Apply Constraints"}
            </button>

            <button 
              onClick={handleSaveSchedule} 
              disabled={loading || !schedule} 
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm 
                ${hasUnsavedChanges ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-slate-100 text-slate-400 border border-slate-200"}`}
            >
              {loading ? "Validating..." : "Validate & Sync"}
            </button>
          </div>
        </div>

        {/* CONTENT AREA */}
        {activeTab === "settings" ? (
          <SettingsTab 
            employees={fakeData.employees} 
            constraints={constraints} 
            setConstraints={setConstraints} 
          />
        ) : (
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragStart={(e) => setActiveDrag(e.active.data.current?.employee)} 
            onDragEnd={onDragEnd}
          >
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8">
              <h3 className="font-bold text-xs uppercase tracking-widest text-slate-400 mb-4">Available Personnel</h3>
              <SortableContext 
                items={fakeData.employees.map(e => e.id)} 
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex flex-wrap gap-3">
                  {fakeData.employees.map((emp) => (
                    <EmployeeItem key={emp.id} emp={emp} />
                  ))}
                </div>
              </SortableContext>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
              <div className="flex-1 w-full overflow-hidden bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="overflow-x-auto pb-4">
                  {schedule ? (
                    <div className="flex gap-4 min-w-[1200px]">
                      {Object.keys(schedule).map((d) => (
                        <div key={d} className="flex-1 min-w-[160px] space-y-4">
                          <div className="bg-slate-800 text-white text-center py-3 rounded-xl font-bold text-xs uppercase tracking-widest">
                            Day {parseInt(d) + 1}
                          </div>
                          {["M", "E", "N"].map((s) => (
                            <ShiftSlot 
                              key={s} 
                              dayIdx={d} 
                              shift={s} 
                              assigned={schedule[d][s] || []} 
                              onRemove={handleRemove} 
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-[400px] flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl gap-3">
                      <span className="text-4xl">📅</span>
                      <p className="font-bold">No active schedule. Use Generate buttons above to start.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* VALIDATION SIDEBAR */}
              <div className="w-full lg:w-[350px] sticky top-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h4 className="text-xs font-black text-slate-400 mb-4 uppercase tracking-widest">Live Validation Status</h4>
                  {warnings.length > 0 ? (
                    <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
                      {warnings.map((w, i) => (
                        <div key={i} className="flex gap-3 p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-semibold leading-relaxed">
                          <span className="flex-shrink-0">⚠️</span> {w}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center bg-emerald-50 rounded-2xl border border-emerald-100">
                      <span className="text-3xl mb-2">✅</span>
                      <p className="text-emerald-700 font-bold text-sm">Policy Compliant</p>
                      <p className="text-emerald-500 text-[10px] uppercase font-bold mt-1">No violations detected</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <DragOverlay>
              {activeDrag ? <EmployeeItem emp={activeDrag} isOverlay /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}