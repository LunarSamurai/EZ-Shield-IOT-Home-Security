export type SystemMode = 'stay' | 'away' | 'disarm';
export type SensorType = 'hall' | 'ultrasonic';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type UserRole = 'admin' | 'user';

export interface Profile {
  id: string;
  name: string;
  pin_code: string;
  pin_set: boolean;
  role: UserRole;
  settings: Record<string, unknown>;
  created_at: string;
}

export interface Zone {
  id: number;
  name: string;
  sensor_type: SensorType;
  location: string | null;
  threshold_cm: number | null;
  is_active: boolean;
  connected: boolean;
  last_seen_at: string | null;
  device_name: string | null;
  created_at: string;
}

export interface SensorEvent {
  id: number;
  zone_id: number;
  event_type: string;
  value: string | null;
  created_at: string;
  zone?: Zone;
}

export interface SystemState {
  id: number;
  mode: SystemMode;
  changed_by: string | null;
  changed_at: string;
}

export interface Alert {
  id: number;
  event_id: number | null;
  zone_id: number;
  severity: AlertSeverity;
  message: string | null;
  acknowledged: boolean;
  created_at: string;
  zone?: Zone;
}

export interface Heartbeat {
  id: number;
  device_id: string;
  status: string;
  created_at: string;
}

export interface ZoneWithStatus extends Zone {
  latest_event?: SensorEvent;
  is_triggered: boolean;
}

export interface PiEventPayload {
  sensor_type: SensorType;
  zone_id: number;
  zone_name?: string;
  device_name?: string;
  event_type: string;
  value?: string;
}

export interface AppConfig {
  registration_secret: string;
  entry_delay_seconds: string;
  exit_delay_seconds: string;
  alarm_duration_seconds: string;
  siren_enabled: string;
  auto_arm_enabled: string;
  auto_arm_time: string;
  alert_cooldown_seconds: string;
  ultrasonic_poll_interval_ms: string;
}
