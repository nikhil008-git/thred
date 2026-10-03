"use client";

import type { ComponentType, Dispatch, RefObject, SetStateAction } from "react";
import {
  PixelBookOpen,
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
  return (
    <div
      data-preview={isHeroPreview ? "true" : "false"}
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
              <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-[#141614]">
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
                  <p className="dashboard-sidebar-panel-section-label">{section.label}</p>
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
                <p className="dashboard-sidebar-panel-section-label">Connect</p>
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
                >
                  <PixelDatabase className="size-[18px] shrink-0 text-[#1a1d19]" />
                  <span className="min-w-0 truncate">HydraDB memory</span>
                </a>
                <a
                  href="https://github.com/nikhil008-git/thred"
                  target="_blank"
                  rel="noreferrer"
                  className="dashboard-sidebar-panel-row"
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
                <div
                  role="menu"
                  className="ui-popover ui-popover-up absolute bottom-[calc(100%+8px)] left-0 right-0 z-30 overflow-hidden rounded-[13px] border border-[#e2e5e0] bg-white p-1.5 shadow-[0_12px_28px_rgba(29,40,31,.13)]"
                >
                  {workspaces.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onWorkspaceChange(item);
                        setSidebarWorkspaceOpen(false);
                      }}
                      className={`flex w-full cursor-pointer items-center rounded-[8px] px-2.5 py-2 text-left text-[13px] transition-colors ${item.id === workspace.id ? "bg-[#eef0ed] font-medium text-[#141614]" : "text-[#4a4f48] hover:bg-[#f4f5f2] hover:text-[#141614]"}`}
                    >
                      <span className="truncate">{item.name}</span>
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
                  className={`size-4 shrink-0 text-[#555a53] transition-transform duration-200 ${sidebarWorkspaceOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            <div ref={accountMenuRef} className="relative">
              {accountMenuOpen && (
                <div
                  role="menu"
                  className="ui-popover ui-popover-up absolute bottom-[calc(100%+8px)] left-0 right-0 z-30 rounded-[13px] border border-[#e2e5e0] bg-white p-2 shadow-[0_12px_28px_rgba(29,40,31,.13)]"
                >
                  <div className="px-2 pb-2">
                    <p className="min-w-0 truncate text-[13px] font-medium text-[#141614]">{accountName}</p>
                  </div>
                  <div className="space-y-0.5 border-t border-[#eceeea] pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onViewChange("settings");
                      }}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-[7px] px-2 py-1.5 text-left text-[12px] text-[#3f433d] hover:bg-[#f4f5f2] hover:text-[#141614]"
                    >
                      <PixelSliders className="size-3.5" />
                      Workspace settings
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onViewChange("apiKeys");
                      }}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-[7px] px-2 py-1.5 text-left text-[12px] text-[#3f433d] hover:bg-[#f4f5f2] hover:text-[#141614]"
                    >
                      <PixelKey className="size-3.5" />
                      Thred agent keys
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onViewChange("providers");
                      }}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-[7px] px-2 py-1.5 text-left text-[12px] text-[#3f433d] hover:bg-[#f4f5f2] hover:text-[#141614]"
                    >
                      <PixelSliders className="size-3.5" />
                      BYOK providers
                    </button>
                    <button
                      type="button"
                      onClick={onSignOut}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-[7px] px-2 py-1.5 text-left text-[12px] text-[#3f433d] hover:bg-[#f4f5f2] hover:text-[#141614]"
                    >
                      <PixelLogout className="size-3.5" />
                      Sign out
                    </button>
                  </div>
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
                  className={`size-4 shrink-0 text-[#555a53] transition-transform duration-200 ${accountMenuOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
