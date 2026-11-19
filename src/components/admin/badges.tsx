import { Badge, type Tone } from "@/components/admin/kit";
import type { Car } from "@/lib/stock/types";
import { carStatus, type CarStatus } from "@/lib/admin/stock-admin-pure";
import { CLAIM_STATUS_LABELS, DRIVE_STATUS_LABELS, ORDER_STATUS_LABELS, leadStatusLabel, type ClaimStatus, type DriveStatus, type LeadStatus, type LeadType, type OrderStatus } from "@/lib/admin/collections";

const LEAD_TONE: Record<LeadStatus, Tone> = { new: "info", contacted: "neutral", appointment: "warn", won: "good", lost: "bad" };
const DRIVE_TONE: Record<DriveStatus, Tone> = { requested: "warn", confirmed: "info", completed: "good", "no-show": "bad", cancelled: "neutral" };

// `type`: a warranty request reads its own words (leadStatusLabel).
export const LeadStatusBadge = ({ status, type = "enquiry" }: { status: LeadStatus; type?: LeadType }) => <Badge tone={LEAD_TONE[status]}>{leadStatusLabel(type, status)}</Badge>;
export const DriveStatusBadge = ({ status }: { status: DriveStatus }) => <Badge tone={DRIVE_TONE[status]}>{DRIVE_STATUS_LABELS[status]}</Badge>;
const CLAIM_TONE: Record<ClaimStatus, Tone> = { open: "warn", booked: "info", approved: "info", declined: "neutral", repaired: "good", closed: "neutral" };
export const ClaimStatusBadge = ({ status }: { status: ClaimStatus }) => <Badge tone={CLAIM_TONE[status]}>{CLAIM_STATUS_LABELS[status]}</Badge>;
// Whether the fault was under the warranty when it was reported.
const CAR_TONE: Record<CarStatus, Tone> = { Draft: "info", Hidden: "warn", Sold: "neutral", Reserved: "info", "For sale": "good" };
export const CarStatusBadge = ({ car }: { car: Pick<Car, "listing" | "soldAt" | "reserved"> }) => {
  const s = carStatus(car);
  return <Badge tone={CAR_TONE[s]}>{s}</Badge>;
};
export const CoverBadge = ({ inCover }: { inCover: boolean }) => <Badge tone={inCover ? "good" : "neutral"}>{inCover ? "In cover" : "Out of cover"}</Badge>;
const ORDER_TONE: Record<OrderStatus, Tone> = { ordered: "neutral", built: "info", "in-transit": "info", arrived: "warn", "handed-over": "good", cancelled: "neutral" };
export const OrderBadge = ({ status }: { status: OrderStatus }) => <Badge tone={ORDER_TONE[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
