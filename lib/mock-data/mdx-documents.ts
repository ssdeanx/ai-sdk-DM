export interface MdxDocument {
  id: string
  title: string
  content: string
  excerpt: string
  user_id: string
  created_at: string
  updated_at: string
}

export const mockMdxDocuments: MdxDocument[] = [
  {
    id: "mock-1",
    title: "Getting Started with MDX",
    content:
      "# Getting Started with MDX\n\nMDX is a format that lets you seamlessly write JSX in your Markdown documents.\n\n## Basic Syntax\n\nMDX is just Markdown with JSX support. You can use all the standard Markdown syntax.\n\n```jsx\n// You can include code blocks\nfunction Example() {\n  return <div>Hello World</div>;\n}\n```",
    excerpt: "Learn the basics of MDX and how to use it in your projects.",
    user_id: "user-1",
    created_at: "2023-12-01T00:00:00.000Z",
    updated_at: "2023-12-01T00:00:00.000Z",
  },
  {
    id: "mock-2",
    title: "Advanced MDX Techniques",
    content:
      "# Advanced MDX Techniques\n\nOnce you're comfortable with the basics of MDX, you can explore more advanced techniques.\n\n## Custom Components\n\nOne of the most powerful features of MDX is the ability to use custom components.\n\n```jsx\nimport { Button } from './components/Button';\n\n# My Document\n\n<Button>Click me</Button>\n```",
    excerpt: "Discover advanced techniques for using MDX in your applications.",
    user_id: "user-1",
    created_at: "2023-12-02T00:00:00.000Z",
    updated_at: "2023-12-02T00:00:00.000Z",
  },
]
