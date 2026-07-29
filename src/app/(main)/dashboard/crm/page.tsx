import { Metadata } from "next";

import { CrmLanding } from "./_components/crm-landing";

export const metadata: Metadata = {
  title: "CRM | Squad Fit",
  description: "Leads, downsell y cupones",
};

export default function CrmPage() {
  return <CrmLanding />;
}
