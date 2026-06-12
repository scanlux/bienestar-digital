'use client';

import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/constants';
import { AlertModal } from '@/components/Common/AlertModal';

interface MaintenanceDetails {
  message: string;
  estimated_end?: string;
  started_at?: string;
}

export default function MaintenancePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [maintenanceActive, setMaintenanceActive] = useState<boolean>(true);
  const [details, setDetails] = useState<MaintenanceDetails | null>(null);
  const [bootProgress, setBootProgress] = useState<number>(0);
  const [simulatedLogs, setSimulatedLogs] = useState<string[]>([]);
  const [countdownText, setCountdownText] = useState<string>('00:00:00');
  const logContainerRef = useRef<HTMLDivElement>(null);

  const isSystemUser = user?.actorType === 'system_user';

  // Lista de logs simulados durante la fase de carga para admins
  const logSteps = [
    { pct: 5, text: 'INIT SYSTEM: KERNEL v1.8.4-RELEASE ON EXP-4000' },
    { pct: 15, text: 'BOOTING MEMORY POOLS: STACK OK, HEAP OK' },
    { pct: 25, text: 'NETWORK SOCKET: BINDING TO ORACLE CLOUD VCN...' },
    { pct: 35, text: 'VCN ACCESSIBILITY: REACHED TAILSCALE VPN HOST' },
    { pct: 45, text: 'CACHE MODULE: CONNECTING TO REDIS SENTINEL...' },
    { pct: 55, text: 'CACHE STATUS: REDIS OK - CLEAN STAMP DETECTED' },
    { pct: 65, text: 'RELATIONAL LAYER: PINING MARIADB TRANSACTION POOL...' },
    { pct: 75, text: 'RELATIONAL STATUS: MARIADB DB_CONNECTED [OK]' },
    { pct: 85, text: 'SECURITY SUITE: ENFORCING RBAC GLOBAL EXCLUSIONS' },
    { pct: 95, text: 'BOOTLOCK SHIELD: ACTIVE - SESSIONS PURGED FROM SYSTEM' },
    { pct: 99, text: 'STANDBY: AWAITING ADMINISTRATOR DEPLOY COMMAND...' }
  ];

  // Auto-scroll en consola de logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [simulatedLogs]);

  // Sondeo de API
  const checkStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/public/maintenance-status`, {
        timeout: 4000
      });
      setServerOnline(true);
      setMaintenanceActive(res.data.maintenanceMode);
      setDetails(res.data.details);

      // Si ya no está en mantenimiento, forzar progreso al 100% y redirigir
      if (!res.data.maintenanceMode) {
        setBootProgress(100);
      }
    } catch (err) {
      setServerOnline(false);
      setBootProgress(0);
      setDetails(null);
    }
  };

  useEffect(() => {
    // Ejecutar chequeo inmediato
    checkStatus();

    // Polling cada 4 segundos
    const interval = setInterval(checkStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  // Animación del progreso y logs simulados
  useEffect(() => {
    if (serverOnline === false) {
      setSimulatedLogs([
        '>>> ERROR: SERVER DISCONNECTED FROM GRAPHICAL CLIENT <<<',
        '>>> STATUS: NO CARRIER ON PORT 4000',
        '>>> ACTION: RETRYING HANDSHAKE IN 4 SECONDS...'
      ]);
      return;
    }

    if (serverOnline === true) {
      if (bootProgress < 99 && maintenanceActive) {
        const timer = setTimeout(() => {
          setBootProgress(prev => {
            const next = prev + Math.floor(Math.random() * 5) + 1;
            const target = next > 99 ? 99 : next;

            // Agregar logs conforme el porcentaje avanza
            const newLogs: string[] = [];
            logSteps.forEach(step => {
              if (step.pct <= target && !simulatedLogs.includes(step.text)) {
                newLogs.push(step.text);
              }
            });

            if (newLogs.length > 0) {
              setSimulatedLogs(prevLogs => [...prevLogs, ...newLogs]);
            }

            return target;
          });
        }, 80);
        return () => clearTimeout(timer);
      } else if (!maintenanceActive && bootProgress < 100) {
        // Modo mantenimiento desactivado, subir a 100%
        setBootProgress(100);
        setSimulatedLogs(prev => [
          ...prev,
          'DEPLOYS: RECEIVED RESTORE ACCESS SIGNAL FROM SYSTEM',
          'GRAPHICS: RESTORING APPLICATION CONSOLE SHELL...',
          'ACCESS granted. REDIRECTING CONTROLLER MODULE...'
        ]);
        
        const redirectTimer = setTimeout(() => {
          router.push('/login');
        }, 1500);
        return () => clearTimeout(redirectTimer);
      }
    }
  }, [serverOnline, bootProgress, maintenanceActive]);

  // Cálculo del temporizador regresivo (countdown)
  useEffect(() => {
    if (!details?.estimated_end) {
      setCountdownText('AWAITING DEPLOY');
      return;
    }

    const updateTimer = () => {
      const targetTime = new Date(details.estimated_end!).getTime();
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setCountdownText('READY TO OPEN');
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const pad = (n: number) => String(n).padStart(2, '0');
      setCountdownText(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [details]);

  // Generación de bloques para la barra de carga pixelada: 30 bloques máximo
  const totalBlocks = 25;
  const filledBlocks = Math.floor((bootProgress / 100) * totalBlocks);
  const barBlocks = '█'.repeat(filledBlocks) + '░'.repeat(totalBlocks - filledBlocks);

  // SI NO ES USUARIO DE SISTEMA: Mostrar el AlertModal estándar con el contador regresivo
  if (!isSystemUser) {
    const alertMessage = serverOnline === false
      ? 'Imposible establecer enlace con el servidor de la plataforma.\nPor favor, verifica tu conexión a internet o reintenta en unos momentos.'
      : `${details?.message || 'El sistema se encuentra en mantenimiento programado.'}\n\nTiempo restante estimado: ${countdownText}`;

    return (
      <SimpleBackground>
        <AlertModal 
          isOpen={true}
          onClose={() => {}}
          onConfirm={checkStatus}
          title="Mantenimiento en Progreso"
          message={alertMessage}
          confirmText="Reintentar"
          isDismissible={false}
          zIndex={5000}
        />
      </SimpleBackground>
    );
  }

  // SI ES USUARIO DE SISTEMA: Mostrar la hermosa pantalla retro arcade
  return (
    <Container>
      <CRTFilter />
      <Scanlines />
      
      <RetroBox>
        <GlitchHeader>
          <GlowText className="blink-fast">[ ADVANCED TRANSACCIONAL CONSOLE v2.0 ]</GlowText>
        </GlitchHeader>

        <StatusPanel>
          <PanelRow>
            <Label>SYSTEM STATE:</Label>
            <Value $color={serverOnline === false ? '#ff0000' : maintenanceActive ? '#ffaa00' : '#00ff00'}>
              {serverOnline === false ? 'OFFLINE' : maintenanceActive ? 'MAINTENANCE_LOCK' : 'ONLINE'}
            </Value>
          </PanelRow>
          <PanelRow>
            <Label>SHIELD STABILITY:</Label>
            <Value $color={serverOnline === false ? '#ff0000' : '#00ff00'}>
              {serverOnline === false ? '00.00%' : `${bootProgress.toFixed(2)}%`}
            </Value>
          </PanelRow>
          <PanelRow>
            <Label>ESTIMATED OPEN:</Label>
            <Value $color="#00ffff" className="timer-glitch">{countdownText}</Value>
          </PanelRow>
        </StatusPanel>

        <SystemMessage>
          <MsgTitle>&gt;&gt; SYSTEM BROADCAST &lt;&lt;</MsgTitle>
          <MsgText>
            {serverOnline === false 
              ? 'Imposible establecer enlace con el servidor Express en el puerto 4000. Verificando infraestructura local...' 
              : details?.message || 'El sistema se encuentra en mantenimiento programado. Los servicios volveran a estar en linea brevemente.'}
          </MsgText>
        </SystemMessage>

        <ProgressContainer>
          <ProgressInfo>
            <span>LOADING MODULES</span>
            <span>{bootProgress}%</span>
          </ProgressInfo>
          <ProgressBar>{barBlocks}</ProgressBar>
        </ProgressContainer>

        <LogPanel>
          <LogHeader>&gt;&gt; STDOUT KERNEL CONSOLE LOGS</LogHeader>
          <LogContent ref={logContainerRef}>
            {simulatedLogs.map((log, index) => (
              <LogLine key={index}>
                <span className="timestamp">[LOG_{index.toString().padStart(3, '0')}]</span> {log}
              </LogLine>
            ))}
            <CursorLine>
              &gt; SYSTEM_WAITING_FOR_DEPLOY_COMMAND<BlinkingCursor />
            </CursorLine>
          </LogContent>
        </LogPanel>

        <Footer>
          TRENDYTECH SYSTEMS. NO EMOJIS PROTOCOL ACTIVE. COLD BOOT INTERCEPTOR.
        </Footer>
      </RetroBox>
    </Container>
  );
}

// Background simple para no-logueados
const SimpleBackground = styled.div`
  min-height: 100vh;
  width: 100vw;
  background-color: #0c0c0c;
  display: flex;
  align-items: center;
  justify-content: center;
`;

// Keyframes
const crtFlicker = keyframes`
  0% { opacity: 0.97; }
  50% { opacity: 1; }
  100% { opacity: 0.98; }
`;

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
`;

// Styled Components
const Container = styled.div`
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

  min-height: 100vh;
  background-color: #030a03;
  color: #39ff14;
  font-family: 'Share Tech Mono', monospace;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  padding: 1.5rem;
  box-sizing: border-box;

  * {
    box-sizing: border-box;
  }
`;

const CRTFilter = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(18, 48, 18, 0) 0%, rgba(0, 0, 0, 0.85) 100%);
  pointer-events: none;
  z-index: 10;
  animation: ${crtFlicker} 0.15s infinite;
`;

const Scanlines = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    rgba(18, 16, 16, 0) 50%, 
    rgba(0, 0, 0, 0.25) 50%
  );
  background-size: 100% 4px;
  pointer-events: none;
  z-index: 9;
`;

const RetroBox = styled.div`
  width: 100%;
  max-width: 760px;
  background-color: #020502;
  border: 3px double #39ff14;
  padding: 2rem;
  box-shadow: 0 0 30px rgba(57, 255, 20, 0.15);
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const GlitchHeader = styled.div`
  border-bottom: 1px solid #39ff14;
  padding-bottom: 0.75rem;
  text-align: center;
`;

const GlowText = styled.div`
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 2px;
  text-shadow: 0 0 10px rgba(57, 255, 20, 0.8);

  &.blink-fast {
    animation: ${blink} 1.5s step-end infinite;
  }
`;

const StatusPanel = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  border: 1px dashed rgba(57, 255, 20, 0.4);
  padding: 1rem;
  background: rgba(57, 255, 20, 0.02);
`;

const PanelRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const Label = styled.span`
  font-size: 0.75rem;
  color: rgba(57, 255, 20, 0.6);
`;

const Value = styled.span<{ $color?: string }>`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${props => props.$color || '#39ff14'};
  text-shadow: 0 0 5px ${props => props.$color || '#39ff14'}80;

  &.timer-glitch {
    font-variant-numeric: tabular-nums;
  }
`;

const SystemMessage = styled.div`
  border: 1px solid #39ff14;
  padding: 1rem;
  background-color: rgba(57, 255, 20, 0.05);
`;

const MsgTitle = styled.div`
  font-weight: 700;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
  text-align: center;
  letter-spacing: 1px;
`;

const MsgText = styled.p`
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.4;
  text-align: justify;
  word-break: break-word;
`;

const ProgressContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ProgressInfo = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  letter-spacing: 1px;
`;

const ProgressBar = styled.div`
  font-size: 1.5rem;
  letter-spacing: -2px;
  line-height: 1;
  text-shadow: 0 0 5px rgba(57, 255, 20, 0.5);
  word-break: break-all;
  overflow: hidden;
  white-space: nowrap;
`;

const LogPanel = styled.div`
  border: 1px solid rgba(57, 255, 20, 0.4);
  background-color: #010301;
  display: flex;
  flex-direction: column;
`;

const LogHeader = styled.div`
  background-color: rgba(57, 255, 20, 0.15);
  padding: 0.4rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  border-bottom: 1px solid rgba(57, 255, 20, 0.4);
`;

const LogContent = styled.div`
  height: 180px;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.8rem;
  font-family: monospace;

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: #010301;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(57, 255, 20, 0.4);
    border-radius: 3px;
  }
`;

const LogLine = styled.div`
  color: rgba(57, 255, 20, 0.85);
  line-height: 1.3;

  .timestamp {
    color: rgba(57, 255, 20, 0.4);
    margin-right: 0.5rem;
  }
`;

const CursorLine = styled.div`
  color: #39ff14;
  margin-top: auto;
  display: flex;
  align-items: center;
`;

const BlinkingCursor = styled.span`
  display: inline-block;
  width: 8px;
  height: 14px;
  background-color: #39ff14;
  margin-left: 4px;
  animation: ${blink} 1s step-end infinite;
`;

const Footer = styled.div`
  text-align: center;
  font-size: 0.65rem;
  color: rgba(57, 255, 20, 0.4);
  border-top: 1px solid rgba(57, 255, 20, 0.2);
  padding-top: 0.75rem;
  letter-spacing: 1px;
`;
