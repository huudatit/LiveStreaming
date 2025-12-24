// frontend/src/components/notifications/NotificationListener.tsx
import { useEffect } from 'react';
import { socket } from '@/services/socket';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function NotificationListener() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?._id) return;

    // Register for notifications when user logs in
    socket.emit('register-notifications', { userId: user._id });
    console.log('📱 Registered for notifications:', user._id);

    // Listen for notifications
    const handleNotification = (data: any) => {
      console.log('🔔 Notification received:', data);

      if (data.type === 'stream_live') {
        // Show toast notification with action
        toast.info(
          `${data.streamerName} đang live: ${data.streamTitle}`,
          {
            duration: 10000, // 10 seconds
            action: {
              label: 'Xem ngay',
              onClick: () => {
                navigate(`/watch/${data.roomName}`);
              }
            }
          }
        );

        // Play notification sound (optional)
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {
          console.log('Could not play notification sound');
        });
      }
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
    };
  }, [user, navigate]);

  return null; // This component doesn't render anything
}