export class CreateEventDto {
  title?: string;
  description?: string;
  date?: string; // yyyy-MM-dd
  startTime?: string; // HH:mm
  endTime?: string; // ISO or HH:mm
  start?: string; // ISO datetime
  end?: string; // ISO datetime
  reminderMinutesBefore?: number;
  ownerUserId?: string;
}
