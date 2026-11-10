import { Badge, type Tone } from "@/components/admin/kit";
import { DRIVE_STATUS_LABELS, LEAD_STATUS_LABELS, type DriveStatus, type LeadStatus } from "@/lib/admin/collections";

const LEAD_TONE: Record<LeadStatus, Tone> = { new: "info", contacted: "neutral", appointment: "warn", won: "good", lost: "bad" };
const DRIVE_TONE: Record<DriveStatus, Tone> = { requested: "warn", confirmed: "info", completed: "good", "no-show": "bad", cancelled: "neutral" };

export const LeadStatusBadge = ({ status }: { status: LeadStatus }) => <Badge tone={LEAD_TONE[status]}>{LEAD_STATUS_LABELS[status]}</Badge>;
export const DriveStatusBadge = ({ status }: { status: DriveStatus }) => <Badge tone={DRIVE_TONE[status]}>{DRIVE_STATUS_LABELS[status]}</Badge>;
