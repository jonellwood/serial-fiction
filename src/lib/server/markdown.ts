import { Marked } from 'marked';
const marked = new Marked({ renderer: { html: () => '' } });
import sanitizeHtml from 'sanitize-html';
export function renderMarkdown(source: string) {
  return sanitizeHtml(marked.parse(source, { async: false }), {
    allowedTags: [
      'p',
      'br',
      'em',
      'strong',
      'blockquote',
      'ul',
      'ol',
      'li',
      'h2',
      'h3',
      'h4',
      'hr',
      'a',
      'code',
      'pre',
    ],
    allowedAttributes: { a: ['href', 'title'] },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
    },
  });
}
