// Content types for Supabase-driven content API

export interface Content {
  id: string;
  type: string; // e.g. 'architecture', 'features', 'footer', 'hero', 'cta', 'code-examples', etc.
  title?: string;
  subtitle?: string;
  description?: string;
  content?: string; // markdown, html, or rich text
  data?: any; // JSON for structured content (e.g. stats, links, sections, code, etc.)
  image_url?: string;
  created_at: string;
  updated_at: string;
}

// Example: For code examples, data could be an array of { filename, code, ... }
export interface CodeExample {
  id: string;
  title: string;
  filename: string;
  code: string;
}

// Example: For CTA, data could be { buttonText, stats: Array<{ id, value, label }> }
export interface CTAContent {
  title: string;
  subtitle?: string;
  buttonText: string;
  stats?: Array<{ id: string; value: string; label: string }>;
}

// Example: For footer, data could be { sections: [...], socialLinks: [...], copyright }
export interface FooterContent {
  sections: Array<{
    id: string;
    title: string;
    links: Array<{ id: string; title: string; url: string }>;
  }>;
  socialLinks?: Array<{
    id: string;
    title: string;
    url: string;
    icon?: string;
  }>;
  copyright?: string;
}
