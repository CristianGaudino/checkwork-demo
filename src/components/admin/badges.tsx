import { Badge, type Tone } from "@/components/admin/kit";
import { CLAIM_STATUS_LABELS, DRIVE_STATUS_LABELS, LEAD_STATUS_LABELS, ORDER_STATUS_LABELS, type ClaimStatus, type DriveStatus, type LeadStatus, type OrderStatus } from "@/lib/admin/collections";

const LEAD_TONE: Record<LeadStatus, Tone> = { new: "info", contacted: "neutral", appointment: "warn", won: "good", lost: "bad" };
const DRIVE_TONE: Record<DriveStatus, Tone> = { requested: "warn", confirmed: "info", completed: "good", "no-show": "bad", cancelled: "neutral" };

export const LeadStatusBadge = ({ status }: { status: LeadStatus }) => <Badge tone={LEAD_TONE[status]}>{LEAD_STATUS_LABELS[status]}</Badge>;
export const DriveStatusBadge = ({ status }: { status: DriveStatus }) => <Badge tone={DRIVE_TONE[status]}>{DRIVE_STATUS_LABELS[status]}</Badge>;
const CLAIM_TONE: Record<ClaimStatus, Tone> = { open: "warn", booked: "info", approved: "info", declined: "neutral", repaired: "good", closed: "neutral" };
export const ClaimStatusBadge = ({ status }: { status: ClaimStatus }) => <Badge tone={CLAIM_TONE[status]}>{CLAIM_STATUS_LABELS[status]}</Badge>;
// Whether the fault was under the warranty when it was reported.
export const CoverBadge = ({ inCover }: { inCover: boolean }) => <Badge tone={inCover ? "good" : "neutral"}>{inCover ? "In cover" : "Out of cover"}</Badge>;
const ORDER_TONE: Record<OrderStatus, Tone> = { ordered: "neutral", built: "info", "in-transit": "info", arrived: "warn", "handed-over": "good", cancelled: "neutral" };
export const OrderBadge = ({ status }: { status: OrderStatus }) => <Badge tone={ORDER_TONE[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
