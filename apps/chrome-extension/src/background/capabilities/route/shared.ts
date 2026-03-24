import type { RouteSelectorResource } from '#~/shared/config.js'

export function buildSelectorResourcePayload(resource: RouteSelectorResource) {
  return {
    name: resource.name,
    description: resource.description,
    selector: resource.selector,
    alternativeSelectors: resource.alternativeSelectors,
    tagName: resource.tagName,
    classes: resource.classes,
    text: resource.text ?? '',
    attributes: resource.attributes,
    url: resource.url ?? ''
  }
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
