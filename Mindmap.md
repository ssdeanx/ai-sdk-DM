# Mindmap & Code Structure Visualization Guide

This guide provides actionable steps and options for generating mindmaps or code structure visualizations from the ai-sdk-dm codebase. It covers both local generation and automation via GitHub Actions workflows.

---

## 1. Code Dependency Graphs (TypeScript/JavaScript)

### **A. Using Madge**

Madge generates visual dependency graphs (SVG/PNG/HTML) from your codebase.

**Install locally:**

```sh
pnpm add -D madge
```

**Generate a graph (SVG):**

```sh
pnpm madge --image graph.svg src/
```

- Replace `src/` with your main code directory if different.
- Output formats: `--image graph.svg`, `--dot graph.dot`, `--circular`, etc.

**View the SVG in your browser or commit as an artifact.**

### **B. Using dependency-cruiser**

Dependency-cruiser offers advanced rules and visualization.

**Install:**

```sh
pnpm add -D dependency-cruiser
```

**Generate a dot graph:**

```sh
pnpm depcruise --output-type dot src | dot -T svg -o dep-graph.svg
```

- Requires [Graphviz](https://graphviz.gitlab.io/download/) for `dot`.

---

## 2. GraphQL Schema Visualization

If your project uses GraphQL, you can visualize the schema as a mindmap or graph.

### **A. Using GraphQL Voyager**

GraphQL Voyager creates interactive visualizations of GraphQL schemas.

**Install globally (or use Docker):**

```sh
pnpm add -g graphql-voyager
```

**Export your schema (SDL):**

```sh
# Example for Apollo Server
npx apollo schema:download --endpoint=http://localhost:4000/graphql schema.graphql
```

**Run Voyager:**

```sh
graphql-voyager schema.graphql
```

- Opens a local web UI for interactive exploration.

**Automate export and artifact upload in CI (see workflow below).**

---

## 3. Automating Visualization in GitHub Actions

You can automate graph generation and upload the result as a workflow artifact.

### **Sample Workflow: .github/workflows/code-structure-graph.yml**

```yaml
name: Generate Code Structure Graph
on:
  push:
    branches: [main]
  workflow_dispatch:
jobs:
  generate-graph:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Generate dependency graph (madge)
        run: pnpm madge --image graph.svg src/
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: code-structure-graph
          path: graph.svg
```

- For GraphQL schema, add steps to export the schema and run Voyager or similar tools.

---

## 4. Best Practices & Troubleshooting

- Ensure your codebase is well-typed and modular for meaningful graphs.
- Large graphs may be hard to read; consider focusing on subdirectories or modules.
- For private repos, artifacts are only visible to repo collaborators.
- For GraphQL, ensure your schema is up-to-date and accessible in CI.

---

## 5. References

- [Madge Documentation](https://github.com/pahen/madge)
- [dependency-cruiser Docs](https://github.com/sverweij/dependency-cruiser)
- [GraphQL Voyager](https://github.com/APIs-guru/graphql-voyager)
- [GitHub Actions Artifacts](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts)

---

// Generated on 2024-05-31
