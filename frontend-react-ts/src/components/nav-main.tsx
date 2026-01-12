import type { ElementType } from "react"
import { Badge } from "@/components/ui/badge"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon: ElementType
    isActive?: boolean
    badge?: string | number
  }[]
}) {
  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild isActive={item.isActive}>
            <a href={item.url}>
              <item.icon />
              <span>{item.title}</span>
              {item.badge && Number(item.badge) > 0 && (
                <Badge variant="destructive" className="ml-auto text-xs px-1.5 py-0.5 h-5 min-w-5 flex items-center justify-center">
                  {Number(item.badge) > 99 ? "99+" : item.badge}
                </Badge>
              )}
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
