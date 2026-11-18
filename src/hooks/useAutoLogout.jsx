import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const DEFAULT_AUTO_LOGOUT_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'];

export default function useAutoLogout(timeoutMs = DEFAULT_AUTO_LOGOUT_TIME) {
    const { logout } = useAuth();

    useEffect(() => {
        let timer;
        let lastActivityTime = Date.now();

        const scheduleLogout = () => {
            window.clearTimeout(timer);
            const timeSinceLastActivity = Math.max(timeoutMs - (Date.now() - lastActivityTime), 0);
            if (timeSinceLastActivity <= 0) {
                logout();
            } else {
                timer = window.setTimeout(logout, timeSinceLastActivity);
            }
        }

        const recordActivity = () => {
            lastActivityTime = Date.now();
            scheduleLogout();
        }

        scheduleLogout();
        ACTIVITY_EVENTS.forEach((eventName) => {
            window.addEventListener(eventName, recordActivity, { passive: true });
        });

        return () => {
            window.clearTimeout(timer);
            ACTIVITY_EVENTS.forEach((eventName) => {
                window.removeEventListener(eventName, recordActivity);
            });
        }
    }, [logout, timeoutMs]);
}
