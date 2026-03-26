import { useStore } from '../store/useStore';

export function ConnectionStatus() {
  const { wsConnected } = useStore();

  const orderConnected = wsConnected.order;
  const notificationConnected = wsConnected.notification;

  // Green = both connected, Yellow = partially connected, Red = both disconnected
  const allConnected = orderConnected && notificationConnected;
  const someConnected = orderConnected || notificationConnected;

  let color: string;
  let label: string;

  if (allConnected) {
    color = 'bg-green-500';
    label = 'All services connected';
  } else if (someConnected) {
    color = 'bg-yellow-500';
    label = 'Partially connected';
  } else {
    color = 'bg-red-500';
    label = 'Disconnected';
  }

  return (
    <div className="flex items-center gap-1.5" title={label}>
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs text-gray-500 hidden sm:inline">{label}</span>
    </div>
  );
}
