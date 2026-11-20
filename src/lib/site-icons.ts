import {
  Atom, Award, BadgeCheck, Bell, BookOpen, Brain, Calculator, CalendarDays, Camera, ClipboardCheck, Clock, Compass,
  FileText, Flag, FlaskConical, Globe, GraduationCap, Heart, Languages, Laptop, Lightbulb, Medal, Megaphone,
  MessageCircle, Microscope, MonitorPlay, Newspaper, PenTool, Phone, Plane, Rocket, School, Shield, ShieldCheck,
  Ship, Sparkles, Star, Stethoscope, Swords, Target, Trophy, Users, type LucideIcon,
} from "lucide-react";

/**
 * Icons the academy can pick for website sections (Admin → Website). Content stores the name,
 * so an unknown name (e.g. from an older version) falls back to the section's default icon.
 */
export const SITE_ICONS = {
  Atom, Award, BadgeCheck, Bell, BookOpen, Brain, Calculator, CalendarDays, Camera, ClipboardCheck, Clock, Compass,
  FileText, Flag, FlaskConical, Globe, GraduationCap, Heart, Languages, Laptop, Lightbulb, Medal, Megaphone,
  MessageCircle, Microscope, MonitorPlay, Newspaper, PenTool, Phone, Plane, Rocket, School, Shield, ShieldCheck,
  Ship, Sparkles, Star, Stethoscope, Swords, Target, Trophy, Users,
} satisfies Record<string, LucideIcon>;

export type SiteIconName = keyof typeof SITE_ICONS;
export const SITE_ICON_NAMES = Object.keys(SITE_ICONS) as SiteIconName[];

export const isSiteIcon = (name: unknown): name is SiteIconName =>
  typeof name === "string" && Object.prototype.hasOwnProperty.call(SITE_ICONS, name);

/** The icon for a stored name, or the fallback. */
export function siteIcon(name: string | undefined, fallback: LucideIcon): LucideIcon {
  return isSiteIcon(name) ? SITE_ICONS[name] : fallback;
}
