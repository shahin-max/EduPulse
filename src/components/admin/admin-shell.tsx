"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { BookOpen, CalendarDays, ChevronsUpDown, ClipboardList, ExternalLink, FileText, IndianRupee, Inbox, LayoutDashboard, Layers, Loader2, LogOut, Megaphone, Moon, ShieldAlert, Sun, Users, type LucideIcon } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu,
  SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import { setDarkMode, useDarkMode } from "@/lib/theme";
import { UserAvatar } from "./ui";

type NavItem = { label: string; href: string; icon: LucideIcon; phase?: number };

/** Items with a `phase` are planned and shown as "Soon" until that phase is built. */
const nav: { group: string; items: NavItem[] }[] = [
  { group: "General", items: [
    { label: "Overview", href: "/admin", icon: LayoutDashboard },
    { label: "Users", href: "/admin/users", icon: Users },
  ] },
  { group: "Academics", items: [
    { label: "Courses & subjects", href: "/admin/courses", icon: BookOpen, phase: 2 },
    { label: "Batches", href: "/admin/batches", icon: Layers, phase: 3 },
    { label: "Classes & attendance", href: "/admin/classes", icon: CalendarDays, phase: 4 },
    { label: "Study materials", href: "/admin/materials", icon: FileText, phase: 5 },
    { label: "Exams", href: "/admin/exams", icon: ClipboardList, phase: 6 },
  ] },
  { group: "Operations", items: [
    { label: "Fees", href: "/admin/fees", icon: IndianRupee, phase: 7 },
    { label: "Announcements", href: "/admin/announcements", icon: Megaphone, phase: 8 },
    { label: "Enquiries", href: "/admin/enquiries", icon: Inbox, phase: 8 },
  ] },
];

const allItems = nav.flatMap(section => section.items);

function FullScreen({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">{children}</div>;
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => { if (status === "anonymous") router.replace("/login"); }, [status, router]);

  if (status !== "authenticated" || !user) return <FullScreen>
    <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Checking your access…</p>
  </FullScreen>;

  if (!user.roles.includes("ADMIN")) return <FullScreen>
    <Card className="w-full max-w-sm text-center">
      <CardHeader className="items-center">
        <ShieldAlert className="mx-auto size-10 text-primary" />
        <CardTitle>Admins only</CardTitle>
        <CardDescription>Your account does not have access to the admin portal.</CardDescription>
      </CardHeader>
      <CardFooter className="justify-center"><Button asChild><Link href="/dashboard">Go to my dashboard</Link></Button></CardFooter>
    </Card>
  </FullScreen>;

  return <TooltipProvider delayDuration={200}>
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset className="min-w-0">
        <AdminTopbar />
        <main id="main" className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
    <Toaster richColors position="top-right" />
  </TooltipProvider>;
}

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

function AdminSidebar() {
  const isActive = useIsActive();
  const { isMobile, setOpenMobile } = useSidebar();
  const closeOnMobile = () => { if (isMobile) setOpenMobile(false); };

  return <Sidebar collapsible="icon">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" asChild tooltip="EduPulse Admin">
            <Link href="/admin" onClick={closeOnMobile}>
              <span className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-sidebar-border">
                <Image src="/logo-mark.png" alt="" width={32} height={32} />
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">EduPulse Academy</span>
                <span className="truncate text-xs text-muted-foreground">Admin portal</span>
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>

    <SidebarContent>
      {nav.map(section => <SidebarGroup key={section.group}>
        <SidebarGroupLabel>{section.group}</SidebarGroupLabel>
        <SidebarMenu>
          {section.items.map(({ label, href, icon: Icon, phase }) => <SidebarMenuItem key={href}>
            {phase ? <>
              <SidebarMenuButton disabled tooltip={`${label} (coming in phase ${phase})`} aria-disabled="true">
                <Icon /><span>{label}</span>
              </SidebarMenuButton>
              <SidebarMenuBadge className="text-[10px] text-muted-foreground">Soon</SidebarMenuBadge>
            </> : <SidebarMenuButton asChild isActive={isActive(href)} tooltip={label}>
              <Link href={href} onClick={closeOnMobile}><Icon /><span>{label}</span></Link>
            </SidebarMenuButton>}
          </SidebarMenuItem>)}
        </SidebarMenu>
      </SidebarGroup>)}
    </SidebarContent>

    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="View website">
            <Link href="/" onClick={closeOnMobile}><ExternalLink /><span>View website</span></Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem><UserMenu /></SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>;
}

function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { isMobile } = useSidebar();
  if (!user) return null;
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
        <UserAvatar name={user.full_name} className="size-8 rounded-lg" />
        <span className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-medium">{user.full_name}</span>
          <span className="truncate text-xs text-muted-foreground">{user.email ?? user.mobile}</span>
        </span>
        <ChevronsUpDown className="ml-auto size-4" />
      </SidebarMenuButton>
    </DropdownMenuTrigger>
    <DropdownMenuContent className="w-56" side={isMobile ? "top" : "right"} align="end" sideOffset={6}>
      <DropdownMenuLabel className="font-normal">
        <p className="truncate text-sm font-medium">{user.full_name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email ?? user.mobile}</p>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild><Link href={`/admin/users/${user.id}`}><Users /> My account</Link></DropdownMenuItem>
      <DropdownMenuItem onSelect={async () => { await logout(); router.replace("/login"); }}><LogOut /> Log out</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}

function AdminTopbar() {
  const pathname = usePathname();
  const dark = useDarkMode();
  const current = [...allItems].sort((a, b) => b.href.length - a.href.length).find(item => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const isDetail = current && pathname !== current.href;

  return <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur sm:px-6">
    <SidebarTrigger className="-ml-1" />
    <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
    <Breadcrumb className="min-w-0 flex-1">
      <BreadcrumbList>
        <BreadcrumbItem className="hidden sm:inline-flex"><BreadcrumbLink asChild><Link href="/admin">Admin</Link></BreadcrumbLink></BreadcrumbItem>
        {current && current.href !== "/admin" && <>
          <BreadcrumbSeparator className="hidden sm:inline-flex" />
          <BreadcrumbItem>{isDetail ? <BreadcrumbLink asChild><Link href={current.href}>{current.label}</Link></BreadcrumbLink> : <BreadcrumbPage>{current.label}</BreadcrumbPage>}</BreadcrumbItem>
        </>}
        {isDetail && <><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>Details</BreadcrumbPage></BreadcrumbItem></>}
        {(!current || current.href === "/admin") && <><BreadcrumbSeparator className="hidden sm:inline-flex" /><BreadcrumbItem><BreadcrumbPage>Overview</BreadcrumbPage></BreadcrumbItem></>}
      </BreadcrumbList>
    </Breadcrumb>
    <Button variant="ghost" size="icon" onClick={() => setDarkMode(!dark)} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
      {dark ? <Sun /> : <Moon />}
    </Button>
  </header>;
}
