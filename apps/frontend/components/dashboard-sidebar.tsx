"use client";

import { useState, type ComponentType, type Dispatch, type RefObject, type SetStateAction } from "react";
import {
  PixelBookOpen,
  PixelCheck,
  PixelChevronDown,
  PixelClose,
  PixelDatabase,
  PixelFolder,
  PixelGear,
  PixelGithub,
  PixelKey,
  PixelLayout,
  PixelLogout,
  PixelMessageText,
  PixelPlug,
  PixelSliders,
} from "@/components/pixel-icons";

type Workspace = { id: string; name: string; slug: string };

/** Dropdown styling shared by the footer menus — paper panel, hairline, soft shadow. */
const menu = {
  panel:
    "ui-popover ui-popover-up absolute bottom-[calc(100%+6px)] left-0 right-0 z-30 overflow-hidden rounded-[10px] border border-[#e8e8e4] bg-[#fcfcfb] p-1 shadow-[0_1px_1px_rgba(0,0,0,0.04),0_12px_32px_rgba(16,22,18,0.1)]",
  label: "px-2.5 pb-1 pt-2 text-[11px] text-[#9a9c96]",
  item: "flex w-full cursor-pointer items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[13px] text-[#4e514c] transition-colors hover:bg-[#f1f2f0] hover:text-[#171717]",
  divider: "my-1 h-px bg-[#e8e8e4]",
};

export type DashboardView =
  | "overview"
  | "mcp"
  | "apiKeys"
  | "providers"
  | "prompts"
  | "docs"
  | "settings";

type NavItem = {
  id: DashboardView;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const OPEN_NAV_SECTIONS: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { id: "overview", label: "Overview", icon: PixelLayout },
    ],
  },
  {
    label: "Configure",
    items: [
      { id: "apiKeys", label: "Thred agent keys", icon: PixelKey },
      { id: "providers", label: "BYOK providers", icon: PixelSliders },
      { id: "prompts", label: "Agent instructions", icon: PixelMessageText },
    ],
  },
  {
    label: "Account",
    items: [{ id: "settings", label: "Settings", icon: PixelGear }],
  },
];

function Mark({ className = "size-8 shrink-0" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className={className} fill="none">
      <defs>
        <linearGradient id="sidebar-mark" x1="3" y1="2" x2="25" y2="27" gradientUnits="userSpaceOnUse">
          <stop stopColor="#262927" />
          <stop offset="1" stopColor="#131514" />
        </linearGradient>
      </defs>
      <rect width="28" height="28" rx="8.5" fill="url(#sidebar-mark)" />
      <path
        d="M9.3 9.1c-2.55 0-2.55 3.82 0 3.82h6.25c2.55 0 2.55 3.82 0 3.82h-3.3c-2.55 0-2.55 3.82 0 3.82h6.45"
        stroke="#F5F7F3"
        strokeWidth="1.95"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7.25" cy="9.1" r="1.55" fill="#F5F7F3" />
      <circle cx="20.75" cy="20.57" r="1.55" fill="#F5F7F3" />
      <circle cx="7.25" cy="9.1" r="0.52" fill="#202320" />
      <circle cx="20.75" cy="20.57" r="0.52" fill="#202320" />
    </svg>
  );
}

type DashboardSidebarProps = {
  isHeroPreview?: boolean;
  mobileNavOpen: boolean;
  onMobileNavClose: () => void;
  view: DashboardView;
  onViewChange: (view: DashboardView) => void;
  workspace: Workspace;
  workspaces: Workspace[];
  onWorkspaceChange: (workspace: Workspace) => void;
  accountName: string;
  sidebarWorkspaceOpen: boolean;
  setSidebarWorkspaceOpen: Dispatch<SetStateAction<boolean>>;
  sidebarWorkspaceRef: RefObject<HTMLDivElement | null>;
  accountMenuOpen: boolean;
  setAccountMenuOpen: Dispatch<SetStateAction<boolean>>;
  accountMenuRef: RefObject<HTMLDivElement | null>;
  onSignOut: () => void;
};

function OpenNavRow({
  label,
  active,
  onSelect,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
  icon: NavItem["icon"];
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={label}
      className={`dashboard-sidebar-panel-row ${active ? "dashboard-sidebar-panel-row-active" : ""}`}
    >
      <Icon className="size-[18px] shrink-0 text-[#1a1d19]" />
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}

export function DashboardSidebar({
  isHeroPreview = false,
  mobileNavOpen,
  onMobileNavClose,
  view,
  onViewChange,
  workspace,
  workspaces,
  onWorkspaceChange,
  accountName,
  sidebarWorkspaceOpen,
  setSidebarWorkspaceOpen,
  sidebarWorkspaceRef,
  accountMenuOpen,
  setAccountMenuOpen,
  accountMenuRef,
  onSignOut,
}: DashboardSidebarProps) {
  const [hovered, setHovered] = useState(false);
  // Menus render inside the panel, so keep it open while one is showing.
  const expanded = isHeroPreview || hovered || sidebarWorkspaceOpen || accountMenuOpen;

  return (
    <div
      data-preview={isHeroPreview ? "true" : "false"}
      data-expanded={expanded ? "true" : "false"}
      data-peek={expanded && !isHeroPreview ? "true" : "false"}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`dashboard-sidebar-group ${
        isHeroPreview
          ? "relative h-full min-h-full"
          : `fixed top-0 left-0 z-50 h-screen transition-transform duration-300 ease-out will-change-transform ${
              mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            } shadow-[18px_0_50px_rgba(20,28,22,.18)] lg:shadow-none`
      }`}
    >
      <aside className="dashboard-sidebar-panel">
        <div className="dashboard-sidebar-panel-inner">
          <div className="dashboard-sidebar-panel-header">
            <div className="flex min-w-0 items-center gap-2.5">
              <Mark className="size-7 shrink-0" />
              <span className="dashboard-sidebar-fade truncate text-[15px] font-semibold tracking-[-0.01em] text-[#141614]">
                {workspace.name}
              </span>
            </div>
            <button
              type="button"
              onClick={onMobileNavClose}
              aria-label="Close navigation"
              className="grid size-8 shrink-0 place-items-center rounded-[7px] text-[#666c64] hover:bg-[#e2e6e0] lg:hidden"
            >
              <PixelClose className="size-4" />
            </button>
          </div>

          <div className="dashboard-sidebar-panel-scroll">
            <nav className="dashboard-sidebar-panel-nav">
              {OPEN_NAV_SECTIONS.map((section, sectionIndex) => (
                <div key={`${section.label}-${sectionIndex}`} className="dashboard-sidebar-panel-section">
                  <p className="dashboard-sidebar-panel-section-label dashboard-sidebar-fade">{section.label}</p>
                  {section.items.map((item) => (
                    <OpenNavRow
                      key={item.id}
                      label={item.label}
                      icon={item.icon}
                      active={view === item.id}
                      onSelect={() => onViewChange(item.id)}
                    />
                  ))}
                </div>
              ))}

              <div className="dashboard-sidebar-panel-section">
                <p className="dashboard-sidebar-panel-section-label dashboard-sidebar-fade">Connect</p>
                <OpenNavRow
                  label="MCP connection"
                  icon={PixelPlug}
                  active={view === "mcp"}
                  onSelect={() => onViewChange("mcp")}
                />
                <OpenNavRow
                  label="Docs"
                  icon={PixelBookOpen}
                  active={view === "docs"}
                  onSelect={() => onViewChange("docs")}
                />
                <a
                  href="https://github.com/hydra-db/hydradb"
                  target="_blank"
                  rel="noreferrer"
                  className="dashboard-sidebar-panel-row"
                  title="HydraDB memory"
                >
                  <PixelDatabase className="size-[18px] shrink-0 text-[#1a1d19]" />
                  <span className="min-w-0 truncate">HydraDB memory</span>
                </a>
                <a
                  href="https://github.com/nikhil008-git/thred"
                  target="_blank"
                  rel="noreferrer"
                  className="dashboard-sidebar-panel-row"
                  title="GitHub repo"
                >
                  <PixelGithub className="size-[18px] shrink-0 text-[#1a1d19]" />
                  <span className="min-w-0 truncate">GitHub repo</span>
                </a>
              </div>
            </nav>
          </div>

          <div className="dashboard-sidebar-panel-footer">
            <div ref={sidebarWorkspaceRef} className="relative">
              {sidebarWorkspaceOpen && (
                <div role="menu" className={menu.panel}>
                  <p className={menu.label}>Workspaces</p>
                  {workspaces.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={item.id === workspace.id}
                      onClick={() => {
                        onWorkspaceChange(item);
                        setSidebarWorkspaceOpen(false);
                      }}
                      className={`${menu.item} ${item.id === workspace.id ? "text-[#171717]" : ""}`}
                    >
                      <span className="min-w-0 flex-1 truncate">{item.name}</span>
                      {item.id === workspace.id && <PixelCheck className="size-3.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setAccountMenuOpen(false);
                  setSidebarWorkspaceOpen((open) => !open);
                }}
                className={`dashboard-sidebar-panel-footer-btn ${sidebarWorkspaceOpen ? "dashboard-sidebar-panel-footer-btn-active" : ""}`}
                aria-expanded={sidebarWorkspaceOpen}
                aria-haspopup="menu"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-[6px] bg-white/80 text-[#6d746b]">
                  <PixelFolder className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-left text-[13px] font-medium text-[#141614]">
                  {workspace.name}
                </span>
                <PixelChevronDown
                  className={`size-4 shrink-0 text-[#555a53] transition-transform duration-100 ${sidebarWorkspaceOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            <div ref={accountMenuRef} className="relative">
              {accountMenuOpen && (
                <div role="menu" className={menu.panel}>
                  <p className={`${menu.label} truncate`}>{accountName}</p>
                  {([
                    ["settings", "Workspace settings", PixelSliders],
                    ["apiKeys", "Thred agent keys", PixelKey],
                    ["providers", "BYOK providers", PixelSliders],
                  ] as const).map(([target, label, Icon]) => (
                    <button
                      key={target}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onViewChange(target);
                      }}
                      className={menu.item}
                    >
                      <Icon className="size-3.5 shrink-0 text-[#8a8c86]" />
                      {label}
                    </button>
                  ))}
                  <div className={menu.divider} />
                  <button type="button" role="menuitem" onClick={onSignOut} className={menu.item}>
                    <PixelLogout className="size-3.5 shrink-0 text-[#8a8c86]" />
                    Sign out
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setSidebarWorkspaceOpen(false);
                  setAccountMenuOpen((open) => !open);
                }}
                className={`dashboard-sidebar-panel-footer-btn ${accountMenuOpen ? "dashboard-sidebar-panel-footer-btn-active" : ""}`}
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#dce3dc] text-[10px] font-semibold text-[#4d564f]">
                  {accountName.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-left text-[13px] font-medium text-[#141614]">
                  {accountName}
                </span>
                <PixelChevronDown
                  className={`size-4 shrink-0 text-[#555a53] transition-transform duration-100 ${accountMenuOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
