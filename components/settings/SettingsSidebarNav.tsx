// Generated on 2025-05-20
'use client';

import React from 'react';
import { FaChevronRight } from 'react-icons/fa';

/**
 * SettingsSidebarNav - Sidebar navigation for settings sections, with icons and advanced styling.
 * @param props.sections Array of section objects { key, label, icon? }
 * @param props.activeKey Currently active section key
 * @param props.onSelect Section select handler
 */
export interface SettingsSidebarNavSection {
  key: string;
  label: string;
  icon?: React.ReactNode;
}
export interface SettingsSidebarNavProps {
  sections: SettingsSidebarNavSection[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export const SettingsSidebarNav: React.FC<SettingsSidebarNavProps> = ({
  sections,
  activeKey,
  onSelect,
}) => (
  <nav className="flex flex-col gap-1 glass-card p-2">
    {sections.map((section) => (
      <button
        key={section.key}
        className={`flex items-center gap-2 p-3 text-left rounded transition-colors hover:bg-accent/60 focus:bg-accent/80 focus:outline-none font-medium ${activeKey === section.key ? 'bg-accent text-primary' : 'text-muted-foreground'}`}
        onClick={() => onSelect(section.key)}
        type="button"
        aria-current={activeKey === section.key ? 'page' : undefined}
      >
        {section.icon || <FaChevronRight className="h-4 w-4 opacity-60" />}
        <span>{section.label}</span>
      </button>
    ))}
  </nav>
);

export default SettingsSidebarNav;
