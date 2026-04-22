import React, { useState, useEffect } from "react";

const shifts = ["M", "E", "N"];
const shiftNames = { M: "7h - 15h", E: "15h - 23h", N: "23h - 7h" };

export default function SettingsTab({ employees = [], constraints, setConstraints }) {

  // ===== SAFE INIT =====
  const safeConstraints = {
    fixed_assignments: Array.isArray(constraints?.fixed_assignments)
      ? constraints.fixed_assignments
      : [],
    days_off: Array.isArray(constraints?.days_off)
      ? constraints.days_off
      : []
  };

  const [selectedEmp, setSelectedEmp] = useState(null);

  useEffect(() => {
    if (employees.length > 0) {
      setSelectedEmp(employees[0]);
    }
  }, [employees]);

  if (!selectedEmp) {
    return <div className="p-6 text-slate-400 text-sm">No employees found</div>;
  }

  // ===== CHECK =====
  const isFixed = (empId, day, shift) =>
    safeConstraints.fixed_assignments.some(
      f => f.employee_id === empId && f.day === day && f.shift === shift
    );

  const isOff = (empId, day, shift) =>
    safeConstraints.days_off.some(
      d => d.employee_id === empId && d.day === day && d.shift === shift
    );

  // ===== CLICK =====
  const handleClick = (empId, day, shift) => {

    let newConstraints = {
      fixed_assignments: [...safeConstraints.fixed_assignments],
      days_off: [...safeConstraints.days_off]
    };

    const fixed = isFixed(empId, day, shift);
    const off = isOff(empId, day, shift);

    // ===== REMOVE CURRENT CELL =====
    newConstraints.fixed_assignments = newConstraints.fixed_assignments.filter(
      f => !(f.employee_id === empId && f.day === day && f.shift === shift)
    );

    newConstraints.days_off = newConstraints.days_off.filter(
      d => !(d.employee_id === empId && d.day === day && d.shift === shift)
    );

    // ===== LOGIC =====
    if (!fixed && !off) {
      // NONE -> FIXED

      // ❗ chỉ 1 ca / ngày
      newConstraints.fixed_assignments = newConstraints.fixed_assignments.filter(
        f => !(f.employee_id === empId && f.day === day)
      );

      newConstraints.fixed_assignments.push({
        employee_id: empId,
        day,
        shift
      });

    } else if (fixed) {
      // FIXED -> OFF (cho phép nhiều ca)
      newConstraints.days_off.push({
        employee_id: empId,
        day,
        shift
      });
    }
    // OFF -> NONE

    setConstraints(newConstraints);
  };

  // ===== REMOVE =====
  const removeFixed = (item) => {
    setConstraints({
      ...safeConstraints,
      fixed_assignments: safeConstraints.fixed_assignments.filter(
        f => !(f.employee_id === item.employee_id && f.day === item.day && f.shift === item.shift)
      )
    });
  };

  const removeOff = (item) => {
    setConstraints({
      ...safeConstraints,
      days_off: safeConstraints.days_off.filter(
        d => !(d.employee_id === item.employee_id && d.day === item.day && d.shift === item.shift)
      )
    });
  };

  return (
    <div className="flex gap-6">

      {/* ===== LEFT: EMPLOYEE LIST ===== */}
      <div className="w-[250px] bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase">
          Employees
        </h3>

        <div className="flex flex-col gap-2">
          {employees.map(emp => (
            <button
              key={emp.id}
              onClick={() => setSelectedEmp(emp)}
              className={`text-left p-3 rounded-xl text-sm font-bold transition-all
                ${selectedEmp.id === emp.id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700"
                }`}
            >
              {emp.is_senior && "⭐ "}{emp.name}
            </button>
          ))}
        </div>
      </div>

      {/* ===== RIGHT ===== */}
      <div className="flex-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">

        <h3 className="font-bold text-sm mb-4 text-slate-700">
          {selectedEmp.is_senior && "⭐ "} {selectedEmp.name}
        </h3>

        {/* ===== GRID ===== */}
        <div className="grid grid-cols-7 gap-3 mb-6">
          {[0,1,2,3,4,5,6].map(day => (
            <div key={day} className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 text-center">
                Day {day+1}
              </p>

              {shifts.map(shift => {
                const fixed = isFixed(selectedEmp.id, day, shift);
                const off = isOff(selectedEmp.id, day, shift);

                let color = "bg-slate-100";

                if (off) color = "bg-rose-500 text-white";
                else if (fixed) color = "bg-emerald-500 text-white";

                return (
                  <div
                    key={shift}
                    onClick={() => handleClick(selectedEmp.id, day, shift)}
                    className={`cursor-pointer p-2 rounded-lg text-center text-[10px] font-bold transition-all ${color}`}
                  >
                    {shiftNames[shift]}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* ===== LEGEND ===== */}
        <div className="flex gap-4 text-xs font-bold mb-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-emerald-500 rounded"></div>
            Fixed (1 per day)
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-rose-500 rounded"></div>
            Off (multi allowed)
          </div>
        </div>

        {/* ===== LIST ===== */}
        <div className="space-y-2">

          {/* FIXED */}
          {safeConstraints.fixed_assignments
            .filter(f => f.employee_id === selectedEmp.id)
            .map((f, i) => (
              <div key={i} className="flex justify-between text-xs bg-emerald-50 p-2 rounded">
                <span>
                  Day {f.day+1} - {shiftNames[f.shift]}
                </span>
                <button onClick={() => removeFixed(f)}>✕</button>
              </div>
          ))}

          {/* OFF */}
          {safeConstraints.days_off
            .filter(d => d.employee_id === selectedEmp.id)
            .map((d, i) => (
              <div key={i} className="flex justify-between text-xs bg-rose-50 p-2 rounded">
                <span>
                  Day {d.day+1} - {shiftNames[d.shift]} OFF
                </span>
                <button onClick={() => removeOff(d)}>✕</button>
              </div>
          ))}

        </div>

      </div>
    </div>
  );
}