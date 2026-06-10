import { useEffect } from 'react';

export interface DocumentMetadataOptions {
  title: string;
  description?: string;
}

export function useDocumentMetadata({ title, description }: DocumentMetadataOptions) {
  useEffect(() => {
    // 1. Title
    const previousTitle = document.title;
    document.title = title;

    // Helper to update or create meta tag
    const metaUpdates: Array<{
      selector: string;
      previousValue: string;
      created: boolean;
    }> = [];

    const syncMeta = (nameOrProp: string, isProperty: boolean, value: string) => {
      const selector = `meta[${isProperty ? 'property' : 'name'}="${nameOrProp}"]`;
      const element = document.querySelector(selector);
      const previousValue = element?.getAttribute('content') ?? '';
      let created = false;

      if (element) {
        element.setAttribute('content', value);
      } else {
        const newMeta = document.createElement('meta');
        newMeta.setAttribute(isProperty ? 'property' : 'name', nameOrProp);
        newMeta.setAttribute('content', value);
        document.head.appendChild(newMeta);
        created = true;
      }

      metaUpdates.push({
        selector,
        previousValue,
        created,
      });
    };

    // Description & OG/Twitter equivalents
    if (description) {
      syncMeta('description', false, description);
      syncMeta('og:description', true, description);
      syncMeta('twitter:description', false, description);
    }

    // OG/Twitter titles
    syncMeta('og:title', true, title);
    syncMeta('twitter:title', false, title);

    // 2. Canonical Link
    const canonicalSelector = 'link[rel="canonical"]';
    const canonicalElement = document.querySelector(canonicalSelector);
    const currentUrl = window.location.href;
    const previousCanonical = canonicalElement?.getAttribute('href') ?? '';
    let canonicalCreated = false;

    if (canonicalElement) {
      canonicalElement.setAttribute('href', currentUrl);
    } else {
      const newLink = document.createElement('link');
      newLink.setAttribute('rel', 'canonical');
      newLink.setAttribute('href', currentUrl);
      document.head.appendChild(newLink);
      canonicalCreated = true;
    }

    return () => {
      // Restore title
      document.title = previousTitle;

      // Restore metas
      for (const update of metaUpdates) {
        const element = document.querySelector(update.selector);
        if (element) {
          if (update.created) {
            element.remove();
          } else {
            element.setAttribute('content', update.previousValue);
          }
        }
      }

      // Restore canonical
      const linkElement = document.querySelector(canonicalSelector);
      if (linkElement) {
        if (canonicalCreated) {
          linkElement.remove();
        } else if (previousCanonical) {
          linkElement.setAttribute('href', previousCanonical);
        }
      }
    };
  }, [title, description]);
}
