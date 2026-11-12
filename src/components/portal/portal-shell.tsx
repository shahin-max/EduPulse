"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect } from "react";
import { ChevronsUpDown, ExternalLink, Loader2, LogOut, Moon, ShieldAlert, Sun, UserRound, type LucideIcon } from "lucide-react";
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
import { homeFor, type RoleCode, type User } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { setDarkMode, useDarkMode } from "@/lib/theme";
import { UserAvatar } from "@/components/admin/ui";

export type NavItem = { label: string; href: string; icon: LucideIcon; soon?: string };
export type NavGroup = { group: string; items: NavItem[] };

/** One signed-in area of the site (admin portal, faculty portal): its sidebar, home and who may enter. */
export type PortalConfig = {
  /** Root of the portal's routes, e.g. "/admin". Pages build links with `usePortal().base`. */
  base: string;
  /** Short label for the breadcrumb root, e.g. "Admin". */
  label: string;
  /** Sidebar subtitle under the academy name, e.g. "Admin portal". */
  subtitle: string;
  nav: NavGroup[];
  /** Roles that may use the portal. */
  roles: RoleCode[];
  denied: { title: string; text: string };
  /** "My account" link in the user menu; omitted when the portal has no account page. */
  accountHref?: (user: User) => string;
};

const PortalContext = createContext<PortalConfig | null>(null);

/** The current portal, for building links that work in both the admin and faculty portals. */
export function usePortal() {
  const portal = useContext(PortalContext);
  if (!portal) throw new Error("usePortal must be used inside a PortalShell");
  return portal;
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">{children}</div>;
}

export default function PortalShell({ config, children }: { config: PortalConfig; children: React.ReactNode }) {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => { if (status === "anonymous") router.replace("/login"); }, [status, router]);

  if (status !== "authenticated" || !user) return <FullScreen>
    <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Checking your access…</p>
  </FullScreen>;

  if (!config.roles.some(role => user.roles.includes(role))) return <FullScreen>
    <Card className="w-full max-w-sm text-center">
      <CardHeader className="items-center">
        <ShieldAlert className="mx-auto size-10 text-primary" />
        <CardTitle>{config.denied.title}</CardTitle>
        <CardDescription>{config.denied.text}</CardDescription>
      </CardHeader>
      <CardFooter className="justify-center"><Button asChild><Link href={homeFor(user)}>Go to my home page</Link></Button></CardFooter>
    </Card>
  </FullScreen>;

  return <PortalContext.Provider value={config}>
    <TooltipProvider delayDuration={200}>
      <SidebarProvider>
        <PortalSidebar config={config} />
        <SidebarInset className="min-w-0">
          <PortalTopbar config={config} />
          <main id="main" className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8 print:max-w-none print:p-0">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      <Toaster richColors position="top-right" />
    </TooltipProvider>
  </PortalContext.Provider>;
}

function useIsActive(base: string) {
  const pathname = usePathname();
  return (href: string) => href === base ? pathname === base : pathname === href || pathname.startsWith(`${href}/`);
}

function PortalSidebar({ config }: { config: PortalConfig }) {
  const isActive = useIsActive(config.base);
  const { isMobile, setOpenMobile } = useSidebar();
  const closeOnMobile = () => { if (isMobile) setOpenMobile(false); };

  return <Sidebar collapsible="icon" className="print:hidden">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" asChild tooltip={`EduPulse ${config.subtitle}`}>
            <Link href={config.base} onClick={closeOnMobile}>
              <span className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-sidebar-border">
                <Image src="/logo-mark.png" alt="" width={32} height={32} />
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">EduPulse Academy</span>
                <span className="truncate text-xs text-muted-foreground">{config.subtitle}</span>
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>

    <SidebarContent>
      {config.nav.map(section => <SidebarGroup key={section.group}>
        <SidebarGroupLabel>{section.group}</SidebarGroupLabel>
        <SidebarMenu>
          {section.items.map(({ label, href, icon: Icon, soon }) => <SidebarMenuItem key={href}>
            {soon ? <>
              <SidebarMenuButton disabled tooltip={`${label} (coming in phase ${soon})`} aria-disabled="true">
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
        <SidebarMenuItem><UserMenu config={config} /></SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>;
}

function UserMenu({ config }: { config: PortalConfig }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { isMobile } = useSidebar();
  if (!user) return null;
  // People with more than one role (e.g. an admin who also teaches) can switch portals here.
  const switches = [
    { roles: ["ADMIN"], base: "/admin", label: "Admin portal" },
    { roles: ["FACULTY", "ADMIN"], base: "/teach", label: "Faculty portal" },
  ].filter(s => s.base !== config.base && s.roles.some(r => user.roles.includes(r as RoleCode)));
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
      {config.accountHref && <DropdownMenuItem asChild><Link href={config.accountHref(user)}><UserRound /> My account</Link></DropdownMenuItem>}
      {switches.map(s => <DropdownMenuItem key={s.base} asChild><Link href={s.base}><ExternalLink /> {s.label}</Link></DropdownMenuItem>)}
      <DropdownMenuItem onSelect={async () => { await logout(); router.replace("/login"); }}><LogOut /> Log out</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}

function PortalTopbar({ config }: { config: PortalConfig }) {
  const pathname = usePathname();
  const dark = useDarkMode();
  const items = config.nav.flatMap(section => section.items);
  const current = [...items].sort((a, b) => b.href.length - a.href.length).find(item => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const isDetail = current && pathname !== current.href;
  const atHome = !current || current.href === config.base;

  return <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur sm:px-6 print:hidden">
    <SidebarTrigger className="-ml-1" />
    <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
    <Breadcrumb className="min-w-0 flex-1">
      <BreadcrumbList>
        <BreadcrumbItem className="hidden sm:inline-flex"><BreadcrumbLink asChild><Link href={config.base}>{config.label}</Link></BreadcrumbLink></BreadcrumbItem>
        {!atHome && current && <>
          <BreadcrumbSeparator className="hidden sm:inline-flex" />
          <BreadcrumbItem>{isDetail ? <BreadcrumbLink asChild><Link href={current.href}>{current.label}</Link></BreadcrumbLink> : <BreadcrumbPage>{current.label}</BreadcrumbPage>}</BreadcrumbItem>
        </>}
        {isDetail && <><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>Details</BreadcrumbPage></BreadcrumbItem></>}
        {atHome && <><BreadcrumbSeparator className="hidden sm:inline-flex" /><BreadcrumbItem><BreadcrumbPage>Overview</BreadcrumbPage></BreadcrumbItem></>}
      </BreadcrumbList>
    </Breadcrumb>
    <Button variant="ghost" size="icon" onClick={() => setDarkMode(!dark)} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
      {dark ? <Sun /> : <Moon />}
    </Button>
  </header>;
}
