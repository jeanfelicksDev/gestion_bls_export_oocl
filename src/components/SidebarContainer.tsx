"use client";

import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";

export default function SidebarContainer() {
  const router = useRouter();

  const handleRefresh = () => {
    window.dispatchEvent(new Event("refresh-data"));
  };

  return <Sidebar onRefresh={handleRefresh} />;
}
