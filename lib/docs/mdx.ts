import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const DOCS_PATH = path.join(process.cwd(), 'content/docs');

export interface DocFrontmatter {
  title: string;
  description?: string;
  order?: number;
}

export interface Doc {
  slug: string[];
  frontmatter: DocFrontmatter;
  content: string;
}

function getDocFilePath(slug: string[]): string | null {
  const basePath = path.join(DOCS_PATH, ...slug);

  // Try .mdx first, then .md
  const mdxPath = `${basePath}.mdx`;
  const mdPath = `${basePath}.md`;

  if (fs.existsSync(mdxPath)) {
    return mdxPath;
  }
  if (fs.existsSync(mdPath)) {
    return mdPath;
  }

  // Try index file in directory
  const indexMdxPath = path.join(basePath, 'index.mdx');
  const indexMdPath = path.join(basePath, 'index.md');

  if (fs.existsSync(indexMdxPath)) {
    return indexMdxPath;
  }
  if (fs.existsSync(indexMdPath)) {
    return indexMdPath;
  }

  return null;
}

export function getDoc(slug: string[]): Doc | null {
  const filePath = getDocFilePath(slug);

  if (!filePath) {
    return null;
  }

  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    slug,
    frontmatter: {
      title: data.title || slug[slug.length - 1] || 'Documentation',
      description: data.description,
      order: data.order,
    },
    content,
  };
}

export function getAllDocs(): Doc[] {
  const docs: Doc[] = [];

  function walkDir(dir: string, slugPrefix: string[] = []) {
    if (!fs.existsSync(dir)) {
      return;
    }

    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        walkDir(filePath, [...slugPrefix, file]);
      } else if (file.endsWith('.mdx') || file.endsWith('.md')) {
        const slugPart = file.replace(/\.(mdx|md)$/, '');
        const slug =
          slugPart === 'index' ? slugPrefix : [...slugPrefix, slugPart];

        const doc = getDoc(slug);
        if (doc) {
          docs.push(doc);
        }
      }
    }
  }

  walkDir(DOCS_PATH);

  return docs;
}
