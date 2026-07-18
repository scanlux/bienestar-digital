'use client';

import React from 'react';
import { 
  Input, 
  CheckboxGroup, 
  MaintenanceBtn, 
  RemoveMaintenanceBtn, 
  ScheduleGrid, 
  Label 
} from '@/components/Common/ModalStyles';
import { DAYS } from '@/constants';

// --- SUB-COMPONENTE PARA FILA DE HORARIO (MODULARIZADO) ---
const ScheduleRow: React.FC<{
  day: any;
  idx: number;
  onUpdate: (idx: number, updates: any) => void;
  onAlert: (message: string) => void;
  formatTime: (time: string | null) => string;
  disabled?: boolean;
}> = ({ day, idx, onUpdate, onAlert, formatTime, disabled = false }) => {
  const is24h = day.is_24h === 1 || day.is_24h === true;
  const isInvalid = day.status === 'abierto' && 
    day.open_time && 
    day.close_time && 
    (is24h 
      ? (day.open_time !== day.close_time && day.open_time >= day.close_time && day.close_time !== '00:00')
      : (day.open_time >= day.close_time && day.close_time !== '00:00') || (day.open_time === day.close_time)
    );

  const hasMaintenance = is24h && day.open_time !== day.close_time;

  return (
    <div className="grid-row" style={{ opacity: day.status !== 'abierto' ? 0.4 : 1, transition: 'opacity 0.3s ease' }}>
      <span className="day-name">{DAYS[day.day_index]}</span>
      
      <select
        value={day.status}
        disabled={disabled}
        onChange={(e) => onUpdate(idx, { status: e.target.value })}
        className={`status-select ${day.status}`}
      >
        <option value="abierto">Abierto</option>
        <option value="cerrado">Cerrado</option>
      </select>

      <div className="time-inputs">
        {!is24h ? (
          <>
            <div />
            <Input
              type="time"
              disabled={disabled || day.status !== 'abierto'}
              className={isInvalid ? 'invalid-time' : ''}
              value={day.open_time || '08:00'}
              onChange={(e) => onUpdate(idx, { open_time: e.target.value })}
              onBlur={() => isInvalid && onAlert('Horario inválido. La hora inicial debe ser menor a la hora final.')}
            />
            <span className="sep">-</span>
            <Input
              type="time"
              disabled={disabled || day.status !== 'abierto'}
              className={isInvalid ? 'invalid-time' : ''}
              value={day.close_time || '20:00'}
              onChange={(e) => onUpdate(idx, { close_time: e.target.value })}
              onBlur={() => isInvalid && onAlert('Horario inválido. La hora inicial debe ser menor a la hora final.')}
            />
            <div />
          </>
        ) : (
          <>
            {hasMaintenance ? (
              <>
                <div />
                <Input
                  type="time"
                  disabled={disabled}
                  className={`maintenance-mode ${isInvalid ? 'invalid-time' : ''}`}
                  value={day.open_time || '00:00'}
                  onChange={(e) => onUpdate(idx, { open_time: e.target.value })}
                  onBlur={() => isInvalid && onAlert('Horario de mantenimiento inválido. El inicio debe ser menor al fin.')}
                  title="Inicio de mantenimiento"
                />
                <span className="sep" style={{ color: '#f97316' }}>M</span>
                <Input
                  type="time"
                  disabled={disabled}
                  className={`maintenance-mode ${isInvalid ? 'invalid-time' : ''}`}
                  value={day.close_time || '00:00'}
                  onChange={(e) => onUpdate(idx, { close_time: e.target.value })}
                  onBlur={() => isInvalid && onAlert('Horario de mantenimiento inválido. El inicio debe ser menor al fin.')}
                  title="Fin de mantenimiento"
                />
                {!disabled ? (
                  <RemoveMaintenanceBtn 
                    type="button" 
                    onClick={() => onUpdate(idx, { open_time: '00:00', close_time: '00:00' })}
                    title="Quitar horario de mantenimiento"
                  >
                    ✕
                  </RemoveMaintenanceBtn>
                ) : <div />}
              </>
            ) : (
              <>
                <div />
                {!disabled ? (
                  <MaintenanceBtn 
                    type="button" 
                    onClick={() => onUpdate(idx, { open_time: '02:00', close_time: '04:00' })}
                  >
                    + Agregar Mantenimiento
                  </MaintenanceBtn>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.2)' }}>Sin mantenimiento</span>
                )}
                <div />
              </>
            )}
          </>
        )}
      </div>

      <CheckboxGroup style={{ padding: 0, justifyContent: 'center' }}>
        <input
          type="checkbox"
          disabled={disabled || day.status !== 'abierto'}
          checked={is24h}
          onChange={(e) => {
            const checked = e.target.checked;
            onUpdate(idx, { 
              is_24h: checked ? 1 : 0,
              open_time: checked ? '00:00' : '08:00',
              close_time: checked ? '00:00' : '20:00'
            });
          }}
          title="Marcar si abre 24h"
        />
      </CheckboxGroup>
    </div>
  );
};

interface StoreScheduleFormProps {
  schedule: any[];
  disabled: boolean;
  onUpdateSchedule: (idx: number, updates: any) => void;
  onAlert: (message: string) => void;
  formatTime: (time: string | null) => string;
}

export const StoreScheduleForm: React.FC<StoreScheduleFormProps> = ({
  schedule,
  disabled,
  onUpdateSchedule,
  onAlert,
  formatTime
}) => {
  return (
    <ScheduleGrid>
      <div className="grid-header">
        <span>Día</span>
        <span>Estado</span>
        <span>Horario / Mantenimiento</span>
        <span>¿24H?</span>
      </div>
      {schedule.map((day: any, idx: number) => (
        <ScheduleRow
          key={day.day_index}
          day={day}
          idx={idx}
          disabled={disabled}
          onUpdate={onUpdateSchedule}
          onAlert={onAlert}
          formatTime={formatTime}
        />
      ))}
    </ScheduleGrid>
  );
};
