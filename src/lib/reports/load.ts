import "server-only";
import { reviewsStore, salesStore, leadsStore } from "@/lib/admin/collections";
import { isSalesLead } from "@/lib/admin/leads";
import { adminCars } from "@/lib/admin/stock-admin";
import type { ReportData } from "./monthly";

export async function loadReportData(): Promise<ReportData> {
  const [leads, cars, sales, reviews] = await Promise.all([leadsStore.list(), adminCars(), salesStore.list(), reviewsStore.list()]);
  return { leads: leads.filter(isSalesLead), cars, sales, reviews };
}
