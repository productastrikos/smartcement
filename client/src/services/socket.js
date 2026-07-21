import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  getDashboardSummary, getBagFilterAlerts, getBagFilterAdvisories, getPlantKpis, getNotifications,
  acknowledgeAlert as apiAcknowledgeAlert,
} from './api';

const SocketContext = createContext(null);
export const DataContext = createContext(null);

const POLL_INTERVAL_MS = 12000;
const BANNER_TTL_MS = 9000;

export function SocketProvider({ children }) {
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [advisories, setAdvisories] = useState([]);
  const [plantKpis, setPlantKpis] = useState(null);
  const [criticalBanners, setCriticalBanners] = useState([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const timerRef = useRef(null);
  const prevModuleStatusRef = useRef({});

  // CHANGED: Promise.allSettled instead of Promise.all — one endpoint failing
  // (e.g. /alerts erroring) no longer blanks out data from the other endpoints
  // that succeeded (e.g. /plant-kpis).
  const fetchAll = useCallback(async () => {
    const results = await Promise.allSettled([
      getDashboardSummary(),
      getBagFilterAlerts(),
      getBagFilterAdvisories(),
      getPlantKpis(),
      getNotifications(),
    ]);

    const [summaryResult, alertsResult, advisoriesResult, plantKpisResult, notificationsResult] = results;

    if (summaryResult.status === 'fulfilled') {
      setSummary(summaryResult.value);
    }
    if (alertsResult.status === 'fulfilled') {
      setAlerts(alertsResult.value.alerts || []);
    } else {
      console.error('getBagFilterAlerts failed:', alertsResult.reason);
    }
    if (advisoriesResult.status === 'fulfilled') {
      setAdvisories(advisoriesResult.value.advisories || []);
    }
    if (plantKpisResult.status === 'fulfilled') {
      setPlantKpis(plantKpisResult.value);
    } else {
      console.error('getPlantKpis failed:', plantKpisResult.reason);
    }
    if (notificationsResult.status === 'fulfilled') {
      setNotifications(notificationsResult.value.notifications || []);
    }

    // Connected if at least the core plant-kpis call succeeded
    setConnected(plantKpisResult.status === 'fulfilled');
    setLastUpdate(new Date());

    if (plantKpisResult.status === 'fulfilled') {
      const plantKpisRes = plantKpisResult.value;
      const prev = prevModuleStatusRef.current;
      const newlyCritical = (plantKpisRes.moduleHealth || []).filter(
        (m) => m.status === 'critical' && prev[m.id] !== 'critical'
      );
      if (newlyCritical.length > 0) {
        const now = Date.now();
        setCriticalBanners((current) => [
          ...current,
          ...newlyCritical.map((m) => ({ id: `${m.id}-${now}`, moduleId: m.id, label: m.label, createdAt: now })),
        ]);
        newlyCritical.forEach((m) => {
          setTimeout(() => {
            setCriticalBanners((current) => current.filter((b) => b.moduleId !== m.id || b.createdAt !== now));
          }, BANNER_TTL_MS);
        });
      }
      prevModuleStatusRef.current = Object.fromEntries((plantKpisRes.moduleHealth || []).map((m) => [m.id, m.status]));
    }
  }, []);

  useEffect(() => {
    fetchAll();
    timerRef.current = setInterval(fetchAll, POLL_INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetchAll]);

  const acknowledgeAlert = useCallback((alertId) => {
    setAlerts((prev) => prev.map((a) => (a.alertId === alertId ? { ...a, acknowledged: true } : a)));
    setNotifications((prev) => prev.map((n) => (n.alertId === alertId ? { ...n, acknowledged: true } : n)));
    apiAcknowledgeAlert(alertId).catch(() => {});
  }, []);

  const dismissBanner = useCallback((bannerId) => {
    setCriticalBanners((current) => current.filter((b) => b.id !== bannerId));
  }, []);

  const dataValue = {
    summary,
    kpis: summary?.kpis || {},
    plant: summary?.plant || {},
    investment: summary?.investment || {},
    alerts,
    notifications,
    advisories,
    plantKpis,
    criticalBanners,
    dismissBanner,
    lastUpdate,
    connected,
    requestData: fetchAll,
    acknowledgeAlert,
  };

  return (
    <SocketContext.Provider value={null}>
      <DataContext.Provider value={dataValue}>{children}</DataContext.Provider>
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
export const useData = () => useContext(DataContext);